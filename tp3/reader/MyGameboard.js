/**
 * MyGameboard
 * @constructor
 */
 function MyGameboard(scene, du, dv) {
   MyBoard.call(this, scene, du, dv);

   this.clickable = true;
   this.auxBoard = this.scene.auxBoard;
   this.scoreboard = this.scene.scoreboard;
   this.AUX_BOARD_TRANSLATION = {x: -8, y: 0, z: 1};

   this.scene.MOVE_WAIT_TIME = 2000;
   this.ANIM_DURATION = 1250;

   this.phases = ['Waiting For Start', 'Playing Game', 'Game Ended', 'Replaying'];
   this.steps = ['Waiting For Initial Cell Pick', 'Waiting For Final Cell Pick'];

   this.paused = false;

   this.currentPhase = 0;
   this.currentPlayer = -1;
   this.currentStep = -1;
   this.startTime = -1;

   this.gameModes = ['Player vs Player', 'Player vs CPU', 'CPU vs CPU'];
   this.players = [['Player', 'Player'], ['Player','CPU'], ['CPU', 'CPU']];
   this.scoreboard.points = [-1,-1];
   this.gameMode = 0;

   this.botLevels = [1,1];

   this.moveHistory = [];
   this.initialCell = {};
   this.finalCell = {};

   this.validMoves = [];

   this.speed = 1;
   this.timeout = false;
   this.timeoutTime = 30;
   this.scoreboard.playTime = -1;
   this.replaying = false;

   this.addPieces();
   this.placePieces();
 }

MyGameboard.prototype = Object.create(MyBoard.prototype);
MyGameboard.prototype.constructor = MyGameboard;

MyGameboard.prototype.getCurrentPlayerType = function() {
  return this.players[this.gameMode][this.currentPlayer];
};

MyGameboard.prototype.verifyEndGame = function() {
  var ended = true;
  for(var i = 0; i < this.matrix.length/2; i++){
    for(var j = 0; j < this.matrix[i].length; j++){
      if(this.matrix[i][j].piece){
        ended = false;
        break;
      }
    }
  }

  if(ended)
    return this.scoreboard.points[0] > this.scoreboard.points[1] ? 'Player 1 Won!' : 'Player 2 Won!';

  ended = true;
  for(var i = this.matrix.length/2; i < this.matrix.length; i++){
    for(var j = 0; j < this.matrix[i].length; j++){
      if(this.matrix[i][j].piece){
        ended = false;
        break;
      }
    }
  }

  if(ended)
    return this.scoreboard.points[0] > this.scoreboard.points[1] ? 'Player 1 Won!' : 'Player 2 Won!';
  else
    return null;
};

MyGameboard.prototype.nextStep = function(){
  this.currentStep = (this.currentStep + 1) % 2;
  if(this.currentStep === 0){
    this.currentPlayer = (this.currentPlayer + 1) % 2;
    var endGame = this.verifyEndGame();

    if(endGame){
      alert(endGame);
      var replayBtn = { 'Replay Game':this.startReplaying.bind(this) };
      this.scene.interface.game.replayBtn = this.scene.interface.game.add(replayBtn, 'Replay Game');
      this.currentPhase++;
    }
  }
};

MyGameboard.prototype.addUndoButton = function(){
  var interface = this.scene.interface;
  if(interface.game.undoBtn)
    return;

  interface.game.remove(interface.game.startBtn);

  var btn = { 'Undo':function(){
    this.undo();
  }.bind(this) };
  this.scene.interface.game.undoBtn = this.scene.interface.game.add(btn, 'Undo');

  if(interface.game.pauseBtn)
    return;
  this.scene.interface.game.pauseBtn = this.scene.interface.game.add(this,'paused').name('Paused');

  var btn = { 'Start Game':this.startGame.bind(this) };
  interface.game.startBtn = interface.game.add(btn, 'Start Game');
};

MyGameboard.prototype.addBotLevelsGUI = function(){
  var interface = this.scene.interface;

  interface.game.remove(interface.game.startBtn);
  interface.game.botLevels = interface.game.addFolder("Bot Levels");
  interface.game.botLevels.open();

  controller_names = [];
  for (var i=0; i<this.scene.interface.game.gameMode; i++) {
    controller_names[i] = this.botLevels[i];
    interface.game.botLevels.add(this.botLevels, i, controller_names[i]).min(1).max(2).step(1).name('Bot ' + Number(i + 1) + ' Level');
  }

  var btn = { 'Start Game':this.startGame.bind(this) };
  interface.game.startBtn = interface.game.add(btn, 'Start Game');
};

MyGameboard.prototype.addGameGUI = function(){
  var interface = this.scene.interface;
  interface.game = interface.gui.addFolder('Game');
  interface.game.open();

  interface.game.add(this, 'speed').min(0.25).max(4).step(0.5).name('Game Speed');

  var timeoutBtn = interface.game.add(this, 'timeout').name('Play Timeout');
  timeoutBtn.onFinishChange(function(){
    if(this.timeout)
      this.scoreboard.playTime = this.timeoutTime;
    else
      this.scoreboard.playTime = -1;
  }.bind(this));

  interface.game.add(this, 'timeoutTime').min(10).max(55).step(5).name('Timeout Duration');

  interface.game.gameMode = 0;
  var dropdown = interface.game.add(interface.game, 'gameMode', {'Player vs Player': 0, 'Player vs CPU': 1, 'CPU vs CPU': 2}).name('Game Mode');
  dropdown.__select.selectedIndex = this.gameMode;
  dropdown.onFinishChange(function(){
      if(interface.game.botLevels)
        interface.removeFolder('Bot Levels', interface.game);
      if(this.scene.interface.game.gameMode > 0)
        this.addBotLevelsGUI();
  }.bind(this));

  var btn = { 'Start Game':this.startGame.bind(this) };
  interface.game.startBtn = interface.game.add(btn, 'Start Game');

};

MyGameboard.prototype.addPieces = function(){
  this.scene.pieces = [];

  for(var i = 0; i < 18; i++){
    this.scene.pieces.push(new MyPiece(this.scene, Math.floor(i/6)+1, i));
  }
};

MyGameboard.prototype.clearTiles = function(){
  MyBoard.prototype.clearTiles.call(this);

  this.auxBoard.clearTiles();
};

MyGameboard.prototype.resetPieces = function(){
  for(var i = 0; i < this.scene.pieces.length; i++)
    this.scene.pieces[i].reset();
};

MyGameboard.prototype.placePieces = function(){
  this.clearTiles();

  this.matchPieceTile(this.matrix[1][2], this.scene.pieces[0]);
  this.matchPieceTile(this.matrix[2][1], this.scene.pieces[1]);
  this.matchPieceTile(this.matrix[2][2], this.scene.pieces[2]);

  this.matchPieceTile(this.matrix[this.du-2][this.dv-3],this.scene.pieces[3]);
  this.matchPieceTile(this.matrix[this.du-3][this.dv-2],this.scene.pieces[4]);
  this.matchPieceTile(this.matrix[this.du-3][this.dv-3],this.scene.pieces[5]);

  this.matchPieceTile(this.matrix[2][0], this.scene.pieces[6]);
  this.matchPieceTile(this.matrix[0][2], this.scene.pieces[7]);
  this.matchPieceTile(this.matrix[1][1], this.scene.pieces[8]);

  this.matchPieceTile(this.matrix[this.du-3][this.dv-1],this.scene.pieces[9]);
  this.matchPieceTile(this.matrix[this.du-1][this.dv-3],this.scene.pieces[10]);
  this.matchPieceTile(this.matrix[this.du-2][this.dv-2],this.scene.pieces[11]);

  this.matchPieceTile(this.matrix[1][0], this.scene.pieces[12]);
  this.matchPieceTile(this.matrix[0][1], this.scene.pieces[13]);
  this.matchPieceTile(this.matrix[0][0], this.scene.pieces[14]);

  this.matchPieceTile(this.matrix[this.du-2][this.dv-1],this.scene.pieces[15]);
  this.matchPieceTile(this.matrix[this.du-1][this.dv-2],this.scene.pieces[16]);
  this.matchPieceTile(this.matrix[this.du-1][this.dv-1],this.scene.pieces[17]);
};

MyGameboard.prototype.matchPieceTile = function(tile, piece){
  tile.piece = piece;
  piece.tile = tile;
};

MyGameboard.prototype.getFirstUnoccupiedAuxTile = function(){
  for(var i = 0; i < this.auxBoard.matrix.length; i++){
    for(var j = 0; j < this.auxBoard.matrix[i].length; j++){
      if(!this.auxBoard.matrix[i][j].piece)
        return {x: j, y: i};
    }
  }
};

MyGameboard.prototype.movePiece = function() {
  var pieceId = this.matrix[this.initialCell.y][this.initialCell.x].piece.id;
  this.matrix[this.initialCell.y][this.initialCell.x].piece = null;
  this.matchPieceTile(this.matrix[this.finalCell.y][this.finalCell.x], this.scene.pieces[pieceId]);
};

MyGameboard.prototype.startGame = function(replay=false){
    if(this.replaying)
      return;
   this.currentPhase = 1;
   this.startTime = this.scene.time;
   this.currentStep = 0;
   this.currentPlayer = 0;
   this.gameMode = this.scene.interface.game.gameMode;
   if(this.gameMode == 1) this.botLevels[1] = this.botLevels[0]; //This is needed to pass the correct level to prolog

   this.scene.waitedTime = 0;

   this.scoreboard.points = [0,0];

   if(this.timeout)
    this.scoreboard.playTime=this.timeoutTime;

   this.addUndoButton();

   if(!replay)
    this.requestInitialBoard();
   this.placePieces();
 };

MyGameboard.prototype.highlightMoves = function(){
  for(var i = 0; i < this.validMoves.length; i++){
    var initialX = this.validMoves[i][0];
    var initialY = this.validMoves[i][1];
    var finalX = this.validMoves[i][2];
    var finalY = this.validMoves[i][3];
    if(initialX == this.initialCell.x && initialY == this.initialCell.y){
      this.matrix[finalY][finalX].highlighted = true;
    }
  }
};

MyGameboard.prototype.hideMoves = function(){
  for(var i = 0; i < this.validMoves.length; i++){
    var finalX = this.validMoves[i][2];
    var finalY = this.validMoves[i][3];
    this.matrix[finalY][finalX].highlighted = false;
  }
};

MyGameboard.prototype.controlsPiece = function(y){
  return y >= this.currentPlayer*4 && y < (this.currentPlayer+1)*4;
};

MyGameboard.prototype.addPlayToHistory = function(){
  var initialTile = this.matrix[this.initialCell.y][this.initialCell.x];
  var targetTile = this.matrix[this.finalCell.y][this.finalCell.x];
  var auxBoardPos = this.getFirstUnoccupiedAuxTile();
  var play = {
    initialCell : this.initialCell,
    finalCell : this.finalCell,
    initialCellPiece : initialTile.piece,
    finalCellPiece : targetTile.piece,
    auxBoardPos : auxBoardPos,
    board : this.prologBoard,
    validMoves : this.validMoves,
  };
  this.moveHistory.push(play);
};

MyGameboard.prototype.undo = function(){
  if(this.moveHistory.length === 0){
    alert('Nothing to undo! Make some plays first');
    return;
  }

  var play = this.moveHistory.pop();

  this.currentPlayer = Math.abs(this.currentPlayer - 1) % 2;
  if(this.timeout)
    this.scoreboard.playTime = this.timeoutTime;

  this.prologBoard = play.board;
  this.validMoves = play.validMoves;

  this.initialCell = play.finalCell;
  this.finalCell = play.initialCell;

  var animDuration = this.ANIM_DURATION/1000/this.speed;
  play.initialCellPiece.moving = true;
  this.movePiece();
  var newAnim = new MyPieceAnimation(animDuration, play.initialCellPiece, this.initialCell.x, this.initialCell.y, this.finalCell.x, this.finalCell.y);
  this.scene.gameAnimations.push(newAnim);
  play.initialCellPiece.animation = newAnim;

  if(play.finalCellPiece){
    var eatenPiece = this.auxBoard.matrix[play.auxBoardPos.y][play.auxBoardPos.x].piece;
    var transformedPos = this.transformAuxBoardCoordinates(play.auxBoardPos.x,play.auxBoardPos.y);
    var dieAnim = new MyPieceDieAnimation(animDuration, 0, eatenPiece, transformedPos.x, transformedPos.y, this.initialCell.x, this.initialCell.y);
    eatenPiece.moving = true;
    eatenPiece.animation = dieAnim;
    this.scene.gameAnimations.push(dieAnim);
    this.auxBoard.matrix[play.auxBoardPos.y][play.auxBoardPos.x].piece = null;
    this.matrix[this.initialCell.y][this.initialCell.x].piece = eatenPiece;
    eatenPiece.tile = this.matrix[this.initialCell.y][this.initialCell.x];
    if(!this.controlsPiece(play.finalCell.y))
      this.scoreboard.points[this.currentPlayer] -= eatenPiece.type;
  }
};

MyGameboard.prototype.startReplaying = function(){
  this.startGame(true);
  this.currentPhase = 3;
  this.replaying = true;
  this.replayIndex = 0;
  this.replayAllMovements();
}

MyGameboard.prototype.replayAllMovements = function(){
  setTimeout(function () {
    if(this.replayIndex < this.moveHistory.length){
      this.replayMovement();
      this.replayAllMovements();
      this.replayIndex++;
    }
    else {
      this.replaying = false;
    }
  }.bind(this), this.scene.MOVE_WAIT_TIME/this.speed);

}

MyGameboard.prototype.replayMovement = function(){
  var move = this.moveHistory[this.replayIndex];
  this.initialCell = move.initialCell;
  this.finalCell = move.finalCell;

  var initialTile = this.matrix[this.initialCell.y][this.initialCell.x];
  var targetTile = this.matrix[this.finalCell.y][this.finalCell.x];

  var animDuration = this.ANIM_DURATION/1000/this.speed;
  initialTile.piece.moving = true;
  var newAnim = new MyPieceAnimation(animDuration, initialTile.piece, this.initialCell.x, this.initialCell.y, this.finalCell.x, this.finalCell.y);

  if(targetTile.piece){
    var newPos = this.getFirstUnoccupiedAuxTile();
    var eatenPiece = targetTile.piece;
    eatenPiece.tile = this.auxBoard.matrix[newPos.y][newPos.x];
    this.auxBoard.matrix[newPos.y][newPos.x].piece = eatenPiece;
    eatenPiece.moving = true;
    var transformedPos = this.transformAuxBoardCoordinates(newPos.x,newPos.y);
    var dieAnim = new MyPieceDieAnimation(animDuration*1.9, animDuration*0.9, targetTile.piece, this.finalCell.x, this.finalCell.y, transformedPos.x,transformedPos.y);
    eatenPiece.animation = dieAnim;
    this.scene.gameAnimations.push(dieAnim);
    if(!this.controlsPiece(this.finalCell.y)){
      this.scoreboard.points[this.currentPlayer] += targetTile.piece.type;
    }
    else{
      var animPeriod = 250/this.speed;
      var mergeAnim = new MyPieceMergeAnimation(animDuration, animPeriod, initialTile.piece, initialTile.piece.type);
      initialTile.piece.type += targetTile.piece.type;
      mergeAnim.initialTime = newAnim.initialTime + animDuration;
      newAnim.nextAnimation = mergeAnim;
      this.scene.gameAnimations.push(mergeAnim);
    }
  }
  this.scene.gameAnimations.push(newAnim);
  initialTile.piece.animation = newAnim;
  this.movePiece();
  this.currentPlayer = (this.currentPlayer + 1) % 2;
}

MyGameboard.prototype.makeMovement = function(){
  var initialTile = this.matrix[this.initialCell.y][this.initialCell.x];
  var targetTile = this.matrix[this.finalCell.y][this.finalCell.x];

  this.addPlayToHistory();

  var animDuration = this.ANIM_DURATION/1000/this.speed;
  initialTile.piece.moving = true;
  var newAnim = new MyPieceAnimation(animDuration, initialTile.piece, this.initialCell.x, this.initialCell.y, this.finalCell.x, this.finalCell.y);

  if(targetTile.piece){
    var newPos = this.getFirstUnoccupiedAuxTile();
    var eatenPiece = targetTile.piece;
    eatenPiece.tile = this.auxBoard.matrix[newPos.y][newPos.x];
    this.auxBoard.matrix[newPos.y][newPos.x].piece = eatenPiece;
    eatenPiece.moving = true;
    var transformedPos = this.transformAuxBoardCoordinates(newPos.x,newPos.y);
    var dieAnim = new MyPieceDieAnimation(animDuration*1.9, animDuration*0.9, targetTile.piece, this.finalCell.x, this.finalCell.y, transformedPos.x,transformedPos.y);
    eatenPiece.animation = dieAnim;
    this.scene.gameAnimations.push(dieAnim);
    if(!this.controlsPiece(this.finalCell.y)){
      this.scoreboard.points[this.currentPlayer] += targetTile.piece.type;
    }
    else{
      var animPeriod = 250/this.speed;
      var mergeAnim = new MyPieceMergeAnimation(animDuration, animPeriod, initialTile.piece, initialTile.piece.type);
      initialTile.piece.type += targetTile.piece.type;
      mergeAnim.initialTime = newAnim.initialTime + animDuration;
      newAnim.nextAnimation = mergeAnim;
      this.scene.gameAnimations.push(mergeAnim);
    }
  }
  this.scene.gameAnimations.push(newAnim);
  initialTile.piece.animation = newAnim;
  this.movePiece();
  this.requestMovement();
  if(this.timeout)
    this.scoreboard.playTime=this.timeoutTime;
  this.nextStep();
};

MyGameboard.prototype.pickCell = function(index){
  if(this.getCurrentPlayerType === 'CPU' || this.paused)
    return;
  index--;
  var x = index % 4;
  var y = Math.floor(index / 4);

  if(this.currentPhase !== 1) return;
  if(this.currentStep === 0){
    if(this.matrix[y][x].piece && this.controlsPiece(y)){
      this.initialCell = {x: x, y: y};
      this.highlightMoves();
      this.matrix[y][x].selected = true;
      this.nextStep();
    }
  }
  else if(this.currentStep === 1){
    if(x === this.initialCell.x && y === this.initialCell.y){
      this.matrix[y][x].selected=false;
      this.currentStep--;
      this.hideMoves();
      return;
    }
    if(this.matrix[y][x].highlighted){
      this.finalCell = {x: x, y: y};
      this.matrix[this.initialCell.y][this.initialCell.x].selected = false;
      this.hideMoves();
      this.makeMovement();
    }
  }
};

MyGameboard.prototype.transformAuxBoardCoordinates = function(x,y){
  var translatedX = (x+this.AUX_BOARD_TRANSLATION.x);
  var translatedY = (y+this.AUX_BOARD_TRANSLATION.z);
  return {x: translatedX, y: translatedY};
}

MyGameboard.prototype.display = function(){

  this.scene.pushMatrix();
    this.scene.translate(0,3,0);
    this.scoreboard.display();
  this.scene.popMatrix();

  this.scene.pushMatrix();
    this.scene.translate(this.AUX_BOARD_TRANSLATION.x,this.AUX_BOARD_TRANSLATION.y,this.AUX_BOARD_TRANSLATION.z);
    this.auxBoard.display();
  this.scene.popMatrix();

  MyBoard.prototype.display.call(this);
};
