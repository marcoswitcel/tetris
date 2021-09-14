//@ts-check

import { rgba } from './colors.js';
import { createCanvas, createMatrix } from './util.js';
import { draw, drawFilled } from './draw.js';

export class TetrisBlockManager {

    static getRandomBlockMatrix() {
        const blocks = 'TL';
        return JSON.parse(
            JSON.stringify(
                this[blocks[blocks.length * Math.random() | 0]]
            )
        );
    }

    static T = {
        code: 1,
        matrix: [
            [ 0, 0, 0 ],
            [ 1, 1, 1 ],
            [ 0, 1, 0 ],
        ],
    };
    static L = {
        code: 2,
        matrix: [
            [ 0, 0, 0, 0 ],
            [ 0, 2, 0, 0 ],
            [ 0, 2, 0, 0 ],
            [ 0, 2, 2, 0 ],
        ],
    };
}

class ARENA_STATE {
    static RUNNING = 0;
    static PAUSED = 1;
    static ENDSCREEN = 2;
}

class FallingBlock {
    constructor(x, y, blockMatrix) {
        this.x = x;
        this.y = y;
        this.code = blockMatrix.code;
        this.matrix = blockMatrix.matrix;
    }
}

/**
 * 
 * @param {number[][]} arena 
 * @param {FallingBlock} block 
 */
function mergeArenaAndBlock(arena, block, width, height) {
    const mergedArena = createMatrix(width, height);
    // Copiando arena antiga
    for (let row = mergedArena.length; row--;) {
        for (let col = mergedArena[row].length; col--;) {
            mergedArena[row][col] =  arena[row][col];
        }
    }
    // Copiando falling block
    const blockMatrix = block.matrix;
    for (let row = blockMatrix.length; row--;) {
        for (let col = blockMatrix[row].length; col--;) {

            if (blockMatrix[row][col] !== 0) {
                const arenaRow = row + block.y;
                const arenaCol = col + block.x;
                if (arenaRow >= 0 && arenaRow < height &&
                    arenaCol >= 0 && arenaCol < width
                    ) {
                    mergedArena[arenaRow][arenaCol] =  blockMatrix[row][col];
                }

            }
        }
    }

    return mergedArena;
}

function IsFallingBlockInFreeSpace(arena, block, width, height) {
    const blockMatrix = block.matrix;
    for (let row = blockMatrix.length; row--;) {
        for (let col = blockMatrix[row].length; col--;) {
            if (blockMatrix[row][col] !== 0) {
                const arenaRow = row + block.y;
                const arenaCol = col + block.x;
                if (arenaRow >= height || arenaRow < 0 ||
                    arenaCol >= width || arenaCol < 0 ||
                    arena[arenaRow][arenaCol] !== 0)
                    {
                    return false;
                }
            }
        }
    }

    return true;
}

export class TetrisArena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.state = ARENA_STATE.RUNNING;
        this.fallingBlock = new FallingBlock(0, 0, TetrisBlockManager.getRandomBlockMatrix());
        this.filledMatrix = createMatrix(width, height); 
        this.arenaMatrix = createMatrix(width, height);

        this.cumulatedTime = 0;
        this.update = (deltatime) => {
            this.cumulatedTime += deltatime;

            if (this.cumulatedTime > 1000) {
                this.blockFall();

            } else {
                this.arenaMatrix = mergeArenaAndBlock(this.filledMatrix, this.fallingBlock, this.width, this.height);
            }
        }
    }

    tryMove(dir) {
        const oldX = this.fallingBlock.x;
        this.fallingBlock.x += dir;

        if (!IsFallingBlockInFreeSpace(this.filledMatrix, this.fallingBlock, this.width, this.height)) {
            this.fallingBlock.x = oldX;
        }
    }

    blockFall() {
        this.cumulatedTime = 0;
        this.fallingBlock.y++;
                
        if (IsFallingBlockInFreeSpace(this.filledMatrix, this.fallingBlock, this.width, this.height)) {
            this.arenaMatrix = mergeArenaAndBlock(this.filledMatrix, this.fallingBlock, this.width, this.height);
        } else {
            this.fallingBlock.y--;
            this.filledMatrix = mergeArenaAndBlock(this.filledMatrix, this.fallingBlock, this.width, this.height);
            this.newBlock();
            this.arenaMatrix = mergeArenaAndBlock(this.filledMatrix, this.fallingBlock, this.width, this.height);
        }
    }

    newBlock() {
        this.fallingBlock = new FallingBlock(0, 0, TetrisBlockManager.getRandomBlockMatrix());
    }

    get colorMap() {
        return [
            null,
            rgba(255, 0, 0),
            rgba(0, 255, 0),
        ];
    }
}

export class TetrisShell {

    constructor(config) {
        this.config = config;
    }

    [Symbol.iterator] () {
        const length = this.pipeline.length;
        let i = 0;
        return {
            next: () => {
                return {
                    value: this.pipeline[i],
                    done: i++ === length,
                }
            }
        }
    }

    setup() {
        const { width, height, blockSize } = this.config;

        const canvas = createCanvas(width, height, document.body);
        const context = canvas.getContext('2d');
        
        const arena = new TetrisArena(10 , 20);
        this.arena = arena;

        function renderArena(deltaTime) {
            draw(context, 0, 0, width, height, rgba(0, 0, 0));
            drawFilled(context, arena.arenaMatrix, 0, 0, blockSize, arena.colorMap);
        }

        this.pipeline = [ arena.update, renderArena ];

        this.listen();
    }

    listen() {
        window.addEventListener('keydown', (event) => {
            // <--
            if (event.keyCode === 37) {
                this.arena.tryMove(-1);
            }
            // -->
            if (event.keyCode === 39) {
                this.arena.tryMove(1);
            }
            // baixo
            if (event.keyCode === 40) {
                this.arena.blockFall();
            }
        })
    }
}