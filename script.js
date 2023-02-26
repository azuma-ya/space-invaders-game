const canvas = document.getElementById("canvas");

const WIDTH = (canvas.width = 400);
const HEIGHT = (canvas.height = 400);

const ASSET = new Image();
ASSET.src = "./image/invaders.png";

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }
    sub(v) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }
    mult(v) {
        if (v instanceof Vec2) {
            return new Vec2(this.x * v.x, this.y * v.y);
        } else {
            return new Vec2(this.x * v, this.y * v);
        }
    }
    mag() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    norm() {
        return this.mult(1 / this.mag());
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    reflect(w)//このベクトルの反射ベクトルを求める。引数は法線ベクトル
    {
        let v = this;
        let cosTheta = v.mult(-1).dot(w) / (v.mult(-1).mag() * w.mag());
        let n = w.norm().mult(v.mag() * cosTheta);
        let r = v.add(n.mult(2));
        return r;
    }
}

class Sprite {
    constructor(image, x, y, width, height) {
        this.img = image;
        this.rect = {
            x: x,
            y: y,
            w: width,
            h: height
        };
    }
}

class Actor {
    constructor(game, x, y, tags = []) {
        this.game = game;
        this.pos = new Vec2(x, y);
        this.tags = tags;
    }
    draw(canvas) { }
    update() { }
    hasTag(tagName) {
        return this.tags.includes(tagName);
    }
}

class SpriteActor extends Actor {
    constructor(game, x, y, widht, height, sprite, tags = []) {
        super(game, x, y, tags);
        this.w = widht;
        this.h = height;
        this.sprite = sprite;
    }
    draw(canvas) {
        const ctx = canvas.getContext("2d");
        const {x: imgX, y: imgY, w:
            imgW, h: imgH} = this.sprite.rect;
        ctx.drawImage(this.sprite.img, imgX, imgY, imgW, imgH, this.pos.x - this.w / 2, this.pos.y - this.h / 2, this.w, this.h);
    }
}

class Player extends SpriteActor {
    constructor(game, radius) {
        const x = game.width / 2;
        const y = game.playerPosY;
        const width = radius * 2;
        const height = radius * 2;
        const sprite = new Sprite(ASSET, 460, 270, 80, 80);
        super(game, x, y, width, height, sprite, ["player"]);
        this.r = radius;
        this.vel = new Vec2(0, 0);
    }
    draw(canvas) {
        this.update();
        super.draw(canvas);
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI, true);
        ctx.stroke();
    }
    update() {
        this.vel = this.game.mouse.sub(this.pos);
        this.pos = this.pos.add(this.vel.mult(1 / this.game.fps).mult(5));
        this.pos.y = this.game.playerPosY;
    }
}

class Bullet extends Actor {
    constructor(game, x, y, vx, vy, radius) {
        super(game, x, y, ["bullet"]);
        this.r = radius;
        this.vel = new Vec2(vx, vy);
        this.acc = new Vec2(0, 70);
    }
    draw(canvas) {
        this.update();
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
        ctx.fill();
    }
    update() {
        this.vel = this.vel.add(this.acc.mult(1 / this.game.fps));
        this.pos = this.pos.add(this.vel.mult(1 / this.game.fps));
        if (this.pos.x + this.r >= this.game.width || this.pos.x - this.r <= 0) {
            this.vel.x = -this.vel.x;
            let count = 0;
            while ((this.pos.x + this.r >= this.game.width || this.pos.x - this.r <= 0) && count < 100) {
                this.pos = this.pos.add(this.vel.mult(1 / this.game.fps));
                count++;
            }
        }
        if (this.pos.y < 0) {
            this.vel.y = -this.vel.y;
        }
        this.game.grids.forEach(grid => {
            grid.grid.forEach(invader => {
                const distance = this.pos.sub(invader.pos).mag();
                const sumOfRaduii = this.r + invader.r;
                if (distance <= sumOfRaduii) {
                    let w = this.pos.sub(invader.pos);
                    let r = this.vel.reflect(w);
                    this.vel = r;
                    this.pos = invader.pos.add(w.norm().mult(this.r + invader.r));
                    invader.destroy = true;
                }
            });
        });
        const distance = this.pos.sub(this.game.player.pos).mag();
        const sumOfRaduii = this.r + this.game.player.r;
        if (distance <= sumOfRaduii) {
            let w = this.pos.sub(this.game.player.pos);
            let r = this.vel.reflect(w);
            this.vel = r;
            this.pos = this.game.player.pos.add(w.norm().mult(this.r + this.game.player.r));
        }
    }
}

class Invader extends SpriteActor {
    constructor(game, x, y, vx, vy, radius) {
        const width = radius * 1.5;
        const height = radius * 1.5;
        const sprite = new Sprite(ASSET, 115, 5, 110, 110);
        super(game, x, y, width, height, sprite, ["invader"]);
        this.r = radius;
        this.vel = new Vec2(vx, vy);
        this.destroy = false;
    }
    draw(canvas) {
        this.update();
        super.draw(canvas);
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
        ctx.stroke();
    }
    update() {
        this.pos = this.pos.add(this.vel.mult(1 / this.game.fps));
    }
}

class Grid {
    constructor(game) {
        this.game = game;
        this.grid = [];
        this.speed = 10;
        this.pos = new Vec2(0, 0);
        this.vel = new Vec2(this.speed, 0);
        this.cellWidth = this.game.height / 10;
        this.width = 8 * this.cellWidth;
        this.height = 4 * this.cellWidth;
        this.nextPosY = this.pos.y + this.height + this.cellWidth;
        this.isDown = false;
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 4; y++) {
                this.grid.push(new Invader(game, x * this.cellWidth + this.cellWidth / 2, y * this.cellWidth + this.cellWidth / 2, this.vel.x, this.vel.y, this.cellWidth / 2.5));
            }
        }
    }
    draw(canvas) {
        this.update();
        this.grid.forEach(invader => invader.draw(canvas));
    }
    update() {
        this.pos = this.pos.add(this.vel.mult(1 / this.game.fps));
        if (!this.isDown) {
            if (this.pos.x < 0 || (this.pos.x + this.width >= this.game.width)) {
                this.isDown = true;
                this.vel = new Vec2(0, this.speed);
                this.invaderUpdate();
            }
        } else if (this.isDown) {
            if (this.pos.y + this.height > this.nextPosY) {
                this.isDown = false;
                this.nextPosY += this.cellWidth;
                if (this.pos.x < 0) this.vel = new Vec2(this.speed, 0);
                else if (this.pos.x + this.width >= this.game.width) this.vel = new Vec2(-this.speed, 0);
                this.invaderUpdate();
            }
        }
    }
    invaderUpdate() {
        this.grid.forEach(invader => invader.vel = this.vel);
    }
}

class Star extends Actor {
    constructor(game, x, y) {
        super(game, x, y, ["star"]);
        this.vel = new Vec2(0, random(5, 30));
        this.size = random(1, 2);
    }
    draw(canvas) {
        this.update();
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = (random(0, 2) != 0) ? "#66f" : "#8af";
        ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
    }
    update() {
        this.pos = this.pos.add(this.vel.mult(1 / this.game.fps));
        if (this.pos.y - this.size > this.game.height) {
            this.pos = new Vec2(random(0, this.game.width), -this.size);
        }
    }
}

class Effect extends Actor {
    constructor(game, x, y, size) {
        super(game, x, y, ["effect"]);
        this.speed = 75;
        this.vel = new Vec2(random(-100, 100), random(-100, 100));
        this.vel = this.vel.norm().mult(random(10, this.speed));
        this.size = size;
        this.destroy = false;
    }
    draw(canvas) {
        this.update();
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = (random(0, 2) != 0) ? "#fff" : "#8af";
        ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
    }
    update() {
        this.pos = this.pos.add(this.vel.mult(1 / this.game.fps));
        this.size -= this.vel.mag() / 10 / this.game.fps;
        if (this.size <= 0) {
            this.destroy = true;
        }
    }
}

class Game {
    constructor() {
        this.canvas = canvas;
        this.restart_btn = document.getElementById("restart");
        this.score_dom = document.getElementById("score");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.playerPosY = this.height - this.height / 10;
        this.debug = false;
        this.fps = 60;

        this.canvas.addEventListener("mousemove", e => {
            this.mouse = new Vec2(e.offsetX, e.offsetY);
            // console.log(e);
        });
        this.restart_btn.addEventListener("click", e => this.restart());
        this.canvas.addEventListener("click", e => {
            this.bullets.push(new Bullet(this, this.player.pos.x, this.player.pos.y - 10, 0, -200, this.height / 50));
        });
    }
    init() {
        this.score_dom.innerText = "00";
        this.states = "play";
        this.score = 0;
        this.mouse = new Vec2(this.width / 2, this.height / 2);
        this.player = new Player(this, this.height / 10);
        this.bullets = [new Bullet(this, this.player.pos.x, this.player.pos.y - 10, 0, -200, this.height / 50)];
        this.grids = [new Grid(this)];
        this.stars = [];
        this.effects = [];
        this.gameOverLine = this.player.pos.y - this.player.r;
        for (let i = 0; i < 100; i++) {
            this.stars.push(new Star(this, random(0, this.width), random(0, this.height)));
        }
    }
    start() {
        requestAnimationFrame(() => this._loop());
    }
    _loop(timestamp) {
        const ctx = this.canvas.getContext("2d");
        switch (this.states) {
            case "play":
                ctx.clearRect(0, 0, this.width, this.height);
                this.player.draw(this.canvas);
                this._bulletUpdate(this.canvas);
                this._invadersUpdate(this.canvas);
                ctx.save();
                ctx.fillStyle = "#fff";
                ctx.globalCompositeOperation = "source-in";
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.globalCompositeOperation = "destination-over";
                this.stars.forEach(star => star.draw(this.canvas));
                this._effectsUpdate(this.canvas);
                ctx.restore();
                break;
            case "gameOver":
                ctx.clearRect(0, 0, this.width, this.height);
                this.stars.forEach(star => star.draw(this.canvas));
                ctx.fillStyle = "#8af";
                ctx.textAlign = "center";
                ctx.font = "bold 30px Poppins, sans-serif";
                ctx.fillText("GAME OVER", this.width / 2, this.height / 2);
                ctx.font = "15px Poppins, sans-serif";
                ctx.fillText(`SCORE   ${this.score}`, this.width / 2, this.height / 2 + 60);
                break;
        }
        requestAnimationFrame(this._loop.bind(this));
    }
    _bulletUpdate(canvas) {
        this.bullets.forEach(bullet => {
            bullet.draw(canvas);
        });
        this.bullets = this.bullets.filter(bullet => {
            return bullet.pos.y + bullet.r < this.height;
        });
    }
    _invadersUpdate(canvas) {
        this.grids.forEach(grid => grid.draw(canvas));
        this.grids.forEach(grid => {
            grid.grid.forEach(invader => {
                if (invader.destroy) {
                    this.incrementScore();
                    for (let i = 0; i < 20; i++) {
                        this.effects.push(new Effect(this, invader.pos.x, invader.pos.y, invader.r / 3));
                    }
                }
                if (invader.pos.y + invader.r > this.gameOverLine) this.states = "gameOver";
            });
            grid.grid = grid.grid.filter(invader => !invader.destroy);
        });
        this.grids = this.grids.filter(grid => grid.grid.length !== 0);
        if (this.grids.length === 0) this.grids = [new Grid(this)];
    }
    _effectsUpdate(canvas) {
        this.effects.forEach(effect => effect.draw(canvas));
        this.effects = this.effects.filter(effect => !effect.destroy);
    }
    restart() {
        this.init();
    }
    incrementScore() {
        this.score++;
        this.score_dom.innerText = this.score.toString().padStart(2, "0");
    }
}

const game = new Game();
game.init();
game.start();

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


