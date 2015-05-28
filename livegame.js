
//get game type and set intro text
$('#intro').text(gameType.slice(0, gameType.length - 1) + '!!!');

//debug later....for when clicking stops working (not sure why that's happening)
function clickReset(){
    var cards = cardnumarray_numbers();
    clickListenersOff();
    addEventListeners(cards, SETLENGTH);
}

//the name of the player playing
var NICKNAME;
//global for determining when to deal more cards.
var DEPLETEDBOARD = SETLENGTH === 4 ? 5 : 9;


//okay, now for the real stuff, setting up the socket that communicates with the server

function fullSetUp(socket){
    setUpPregame(socket);
    startGame(socket);
    chatForm(socket);
    cardClicks(socket);
    dealFunctions(socket);   
}

function setUpPregame(socket){
    socket.on('connect', function(data){
        NICKNAME = prompt("Your name, please", 'anonymous' + String(Math.round(1000*Math.random())));
        socket.emit('join', NICKNAME);

    });

    socket.on('allPlayers', function(setsPerPlayerObj){
        //an event that fires when a new player joins game. setsPerPlayerObj is an object that keeps
        //track not only of who's in the game but how many sets hesh has.
        //the event triggers two new lines, one to keep track of the number of sets for each player
        // and one that will list out the sets (like the actual cards for each player)
        $('#players').text('');
        $('#sets').text('');
        forEachIn(setsPerPlayerObj, function(prop, val){
            var newp = dom('P', {id: prop}, prop + '\'s set count: ' + String(val));
            $('#players').append(newp);
            var dummy = dom('P', null, prop + '\'s sets: ');
            var setp = dom('P', {id: prop + '-sets'});
            $('#sets').append(dummy).append(setp);

        });
        var numPlayers = Object.size(setsPerPlayerObj);
        $('#numclients').text(String(numPlayers));
    });
    socket.on('disconnect', function(numPlayers){
        //var current = $('#numclients').text();
        $('#numclients').text(String(numPlayers));
    });
    // socket.on('player has departed', function(name){
    //     alert(name + ' left :(');    
    // });
}


function startGame(socket){
    $('#start-game').click(function(){
        //new code! don't let that button break the whole dickin site
        if ($('IMG').length > 0){
            alert('game in progress, please go to home page or refresh to start a new game');
        }
        else {
            console.log(SETLENGTH);
            socket.emit('start game', SETLENGTH); //$('#paragraph').html());
        }
    });
    //for the end
    socket.on('game over', function(data){

        var t = data.t; //game time
        var setsPerPlayerObj = data.setsPerPlayer;
        var max = 0;
        var winner;
        forEachIn(setsPerPlayerObj, function(prop, val){
            if (val > max){
                winner = prop;
                max = val;
            }
        });
        alert('game over! ' + winner + ' won! ' + 'game time : ' + String(t) + ' seconds ');
    });
}


function chatForm(socket){

    $('form').submit(function(){
        var data = {playerName: NICKNAME, msg: $('#m').val()}
        socket.emit('chat message', data);
        $('#m').val('');
        return false;
      });

    socket.on('chat message', function(data){
        //console.log('incoming message');
        $('#messages').append($('<li>').text(data.playerName + ':  ' + data.msg));
    });
}

var oppFindSet;

//function deals with receiving click event from other players
function cardClicks(socket){
    socket.on('noClicksUntil', function(data){
        var card = data.card;
        changeBorderStyle(card);
        //dont allow clicks in the meantime
        clickListenersOff();
        //check if opponent found set
        oppFindSet = setTimeout(function(){
            var cards = cardnumarray_numbers();
            clickListenersOff();
            allBordersSolid();
            addEventListeners(cards, SETLENGTH);
            socket.emit('clickBanExpiring');

        }, 600 * SETLENGTH);
    });
    socket.on('secondCardClick', function(card){
        changeBorderStyle(card);
    });
}


var deck;

function dealFunctions(socket){
    socket.on('order of deck', function(data){
        //event that fires when start-game button is clicked.
        //server sends all clients the shuffled deck order
        deck = data.deck;

        SETLENGTH = data.SETLENGTH;
        var type = SETLENGTH === 4 ? 'superSet' : 'set';
        $('#intro').text(type + '!');
        DEPLETEDBOARD = SETLENGTH === 4 ? 5 : 9;
        //first deal is 9 cards for super, 12 for set
        var firstCards = deck.splice(0, 36 / SETLENGTH);
        firstDeal(firstCards, SETLENGTH);
        //start timer
        timer();
    });


    socket.on('dealing more', function(){
        var cardsOnBoard = cardnumarray_numbers();
        if (cardsOnBoard.length <= DEPLETEDBOARD){
            //deal
            var cards = deck.splice(0, SETLENGTH);
            dealMore(cards);
        }

    });
    //deprecated
    // socket.on('force deal next three', function(){
    //     var cards = deck.splice(0, 3);
    //     dealMore(cards);
    // });
    socket.on('set found', function(data){
        //another player in teh game found a set
        var cards = data.cards;
        var setsPerPlayerObj = data.setsPerPlayer;
        clearTimeout(oppFindSet);

        //not sure why thsi is here
        socket.emit('clickBanExpiring');
        addSetsToCount(setsPerPlayerObj);
        removeDeal(cards);
        addToSetsOnScreen(cards, data.player);
    });
    //previous version
    // socket.on('falsey', function(){
    //     var current = $('#setsFoundOpponent').text();
    //     $('#setsFoundOpponent').text(String(Number(current) - 1));
    // });
    socket.on('false set call', function(setsPerPlayer){
        addSetsToCount(setsPerPlayer);
    });
    socket.on('show hintcard', function(){
        displayHint();
    });

}

function addSetsToCount(setsPerPlayerObj){
    forEachIn(setsPerPlayerObj, function(prop, val){
        $('#' + prop).text(prop + '\'s set count: ' + String(val));

    });
}

function addToSetsOnScreen(cards, playerName){
    var newp = dom('P', null);
    var cardImgs = cards.map(function(current){
        return domCard(current);
    });
    var id = playerName + '-sets';
    $('#' + id).prepend(newp);
    cardImgs.forEach(function(cardImg){
        newp.appendChild(cardImg);
    });
}

//create socket for the current url
var socket = io('/' + document.URL.split('/')[document.URL.split('/').length - 1]);
//get er done
fullSetUp(socket);
