//global game specs
var suits = ['Clubs', 'Spades', 'Diamonds', 'Hearts']
var numbers = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
var numCards = suits.length * numbers.length, handSize = 7, dealt = false;

function resetGame() {
	//set all buttons/messages back to initial state
	$('#win_message').css({'visibility':'', 'font-size':''});
	$('#rules_message').css({'visibility':'', 'pointer-events':''});
	$('#start_button')[0].textContent = 'Deal Cards';
	//generate all 52 cards as a stack on the upper left
	dealt = false;
	$('div.pile > .inner').empty(); //the inner div of a pile holds its cards
	$stack = $('#stack');
	//make an array of the numbers 0-51
	var cards = []
	for(var i = 0; i < numCards; i++) cards.push(i);
	//and randomly iterate over it to generate the .card divs in the deck, until it is empty - this way the deck is shuffled
	for(var i = 0; i < numCards; i++) {
		var c = Math.floor(Math.random() * cards.length);
		var s = Math.floor(cards[c] / numbers.length);
		var n = cards[c] % numbers.length;
		cards.splice(c, 1);
		text = n < 9 ? ''+(n+2) : numbers[n].charAt(0);
		text += suits[s].charAt(0);
		//create the card div
		$card = $('<div class="card" suit="' + suits[s] + '" number="' + numbers[n] + '"></div>');
		$card.attr('dealt','false');
		$card.attr('moving','false');
		$card.attr('mousePressed','false');
		$card.append('<div><div>' + text + '</div></div>'); //see rummy.css - 2 nested divs required to center text within card
		//now add the card to the deck
		$('#stack > .inner').append($card);
		
		//for each card, create an invisible 'target card' that will be used as the endpoint for animated movements between piles
		$card.data('targetCard', $card.clone().css('visibility','hidden'));

		//cards can be dragged and dropped between the hand and set piles
		$card.draggable({
			disabled: true,
			cancel: '[moving="true"]',
			distance: 15,
			revert: 'invalid',
			helper: 'clone',
			cursor: 'move',
			zIndex: 1,
			start: function(event,ui) {
				$(this).css('visibility','hidden');
			},
			stop: function(event,ui) {
				$(this).css('visibility','');
			}
		});
		$card.droppable({
			tolerance: 'intersect',
			scope: 'notDroppable', //placeholder that means this cannot be dropped on until it is dealt
			accept: function(draggable) { //don't allow moving cards to be dragged onto
				return $(this).attr('moving') === 'false';
			},
			activate: function(event,ui) {
				//console.log(cardName($(this)) + ' ready to receive ' + cardName(ui.draggable));
			},
			drop: function(event,ui) {
				var $this = $(this), $other = ui.draggable, $before;
				//console.log(cardName($other) + ' dropped onto ' + cardName($this) + ' from ' + JSON.stringify(ui.helper.position()));
				if(getPile($other) !== getPile($this) || $other.index() > $this.index())
					$before = $this;
				else {
					$before = nextCard($this);
				}
				//start the animation from the position of the 'helper' that the user is dragging
				moveCard($other, getPile($this), 0, $before, ui.helper.position());
			},
		});
		
		//clicking a hand/set card also toggles which pile it is in
		//and right-clicking a hand card discards it - we need .mousedown/.mouseup because .click doesn't handle right-clicks
		$card.mousedown(function(event) {
			$(this).attr('mousePressed','true');
			return true;
		});
		$card.mouseup(function(event) {
			if($(this).attr('mousePressed') !== 'true') return true;
			//console.log(cardName($(this)) + ' clicked');
			$(this).attr('mousePressed','false');
			switch(getPile($(this))) {
				case 'stack':
					if(!dealt) deal();
					break;
				case 'hand': //move a clicked card from the hand to the temporary zone for building runs/sets
					if(event.which === 1 || event.button === 1) moveCard($(this), 'set');
					else {
						if(topCard() !== undefined) {
							moveCard($(this), 'discard');
							dealCard();
						}else alert('No more cards to deal!');
					}
					break;
				case 'set':
					moveCard($(this), 'hand');
					break;
				default:
					break;
			}
			return true;
		});
//*/
	}

//TRIED USING SORTABLE - COULDN'T GET IT TO LOOK SMOOTH	
/*	$('#hand > .inner').sortable({
		revert: true,
		cancel: '[moving="true"]',
		connectWith: '#set',
		dropOnEmpty: true,
		cursor: 'move',
		helper: 'clone',
		distance: 15,
		tolerance: 'intersect',
		zIndex: 5,
		start: function(e, ui) {
			var $ph = $(ui.placeholder);
			$ph.data('lastPos',$(this).index());
		},
		change: function(e, ui) {
			var $ph = $(ui.placeholder);
			if($ph.data('lastPos') < $ph.index()) {
				var $next = $ph.next();
				if($next.length > 0) $next.css('margin-right','125px').animate({'margin-right':'0px'},500);
			}else {
				var $prev = $ph.prev();
				if($prev.length > 0) $prev.css('margin-left','125px').animate({'margin-left':'25px'},500);
			}
			$(ui.placeholder).css('width','0px').animate({'width':'100px'},500);
			$ph.data('lastPos', $ph.index());
		},
	});
	$('#set > .inner').sortable({
		revert: 500,
		cancel: '[moving="true"]',
		connectWith: '#set',
		dropOnEmpty: true,
		cursor: 'move',
		helper: 'clone',
		distance: 15,
		tolerance: 'intersect',
		zIndex: 5
	});
//*/
}

function cardName($card) {
	return $card.attr('number') + ' of ' + $card.attr('suit');
}

//determine a card's current pile
function getPile($card) {
	return $card.parents('.pile').attr('id');
}

function deal() {
	//deal the top 7 cards from the stack
	for(var i = 0; i < handSize; i++) dealCard(i*150);
	dealt = true;
	$('#start_button')[0].textContent = 'Reset Game';
}
//send the top card from the deck to the hand
function dealCard(delay=0) {
	var $topCard = topCard();
	if($topCard === undefined) {
		console.log('No more cards to deal!');
		return;
	}
	$topCard.attr('dealt','true');
	moveCard($topCard, 'hand', delay);
}
function topCard() {
	var $stack = $('#stack > .inner > .card[dealt="false"]');
	if($stack.length === 0) return undefined;
	return $stack.last();
}

/* move the specified card to a new pile or a new slot within its current pile
 *  $card: the .card div to move
 *  pile: the id string of the destination pile
 *  delay: milliseconds before the animation begins (useful for staggering the initial deal)
 *  $before: optionally, the card in the destination pile to insert this one in front of - by default, will be added to the end
 *  from: the position to begin animating from - if this card was dragged into place, use the position of its Draggable's helper
 */
function moveCard($card, pile, delay=0, $before=undefined, from={}) {

	/* here is the protocol: 
	 *   1) identify all cards that will need to move
	 *   2) switch these all to absolute position so we can animate their top and left properties
	 *   3) place all their target cards at their destination as a placeholder/indicator of where to move to
	 *   4) perform the animations
	 */
	 
	/* STEP 1 */
	var $curPile = $('#' + getPile($card) + ' > .inner'), $movingCards = $card;
	var $newPile = $('#' + pile + ' > .inner');
	$card.attr('moving','true');
	//if either the source or destination pile is a line of cards rather than a stack, some cards may need to shift left/right
	if($curPile.css('position') !== 'absolute' || $newPile.css('position') !== 'absolute') {
		//if moving from one pile to another...
		if(!$curPile.is($newPile)) {
			//the cards to my right in the source pile will shift left by one slot
			$movingCards = $movingCards.add($card.nextAll('.card[moving="false"]').filter(function() {
				return typeof $(this).data('targetCard') != 'undefined'; }));
			//and the cards to my right in the destination pile will shift right by one slot
			if($before !== undefined && $newPile.css('position') !== 'absolute')
				$movingCards = $movingCards.add($before.add($before.nextAll('.card[moving="false"]').filter(function() {
					return typeof $(this).data('targetCard') != 'undefined'; })));
		}else { //if moving within a pile, the cards between my current and destination slots will shift
			var start, end; //first identify those slots
			if($before !== undefined) {
				if($before.index() < $card.index()) {
					start = $before.index();
					end = $card.index()+1;
				}else {
					start = $card.index();
					end = $before.index();
				}
			}else {
				start = $card.index();
				end = $curPile.children().length;
			}
			//then find all non-moving, non-target cards within that range of slots (non-target means I have a target)
			$range = $curPile.children('.card[moving="false"]');
			$range = $range.filter(function() { return typeof $(this).data('targetCard') != 'undefined'; }).slice(start,end);
			$movingCards = $movingCards.add($range);
		}
	}
	
	/* STEP 2 */
	//cache each card's current position so it isn't changed by starting to animate the one to the left of it
	$movingCards.each(function(i) {
		if($(this).is($card) && from.hasOwnProperty('top')) $(this).data('curPos', from);
		else $(this).data('curPos', $(this).position());
	});
	//switch each card to absolute position for the duration of the animation...
	$movingCards.each(function(i) {
		var $this = $(this), pos = $(this).data('curPos');
		$this.css('position', 'absolute');
		if($this.is($card)) $this.css('z-index','1');
		$this.css({'top': pos.top+'px', 'left': pos.left+'px'}); //make sure it stays in place when switching to absolute
	});
	
	/* STEP 3 */
	//get all the target cards in place so we know their positions
	$movingCards.each(function(i) {
		var $this = $(this), $target = $this.data('targetCard').detach().css({'position':'','top':'0','left':'0'});
		if(!($this.is($card))) $target.insertAfter($this);
		else {
			if($before === undefined) $target.appendTo($newPile);
			else $target.insertBefore($before);
		}
	});
	
	/* STEP 4 */
	//do the animation!
	$movingCards.each(function(i) {
		var $this = $(this), $target = $this.data('targetCard');
		var pos = $(this).data('curPos');
		var deltaTop = $target.offset().top - $this.offset().top, deltaLeft = $target.offset().left - $this.offset().left;
		//console.log('moving ' + cardName($this) + ' from ' + pos.top + ',' + pos.left + ' by ' + deltaTop + ',' + deltaLeft);
		$this.stop().delay(delay).animate(
			{
				top:'+='+deltaTop+'px',
				left:'+='+deltaLeft+'px'
			},
			{
				duration: $this.is($card) && !from.hasOwnProperty('top') ? 1000 : 500,
				complete: function() {
					$this.attr('moving','false');
					$this.css({'position':'', 'z-index':'', 'top':'0', 'left':'0'});
					if($this.is($card) && !($newPile.is($curPile))) $target.replaceWith($this);
					else $target.replaceWith($this);
					if(getPile($this) === 'hand') {
						$this.draggable('option','disabled',false);
						$this.draggable('option','scope','hand');
						$this.setDroppableScope('hand');
					}else if(getPile($this) === 'discard') {
						$this.draggable('option','disabled',true);
					}
					if($('.card[moving="true"]').length === 0) checkWin();
				}
			}
		);
	});
}

//find the next/previous card in my line - be sure to exclude moving cards and target cards
function nextCard($card) {
	var $next = $card.nextAll('.card[moving="false"]').filter(function() {
		return typeof $(this).data('targetCard') !== 'undefined'});
	return $next.length > 0 ? $next.first() : undefined;	
}
function prevCard($card) {
	var $prev = $card.prevAll('.card[moving="false"]').filter(function() {
		return typeof $(this).data('targetCard') !== 'undefined'});
	return $prev.length > 0 ? $prev.first() : undefined;	
}

function printPos($card) {
	//console.log($card.attr('number') + ' of ' + $card.attr('suit') + ' at ' + $card.css('top') + ',' + $card.css('left') + ' under ' + $card.parent().attr('id'));
}

function checkWin() {
	console.log('checking win');
	var win = true; //innocent until proven guilty
	$('#hand>.inner, #set>.inner').each(function(i) {
		var $card = $(this).children(':first');
		if($card.length < 1) return;
		var $next, setType = '', setSize = 1, curMatch;
		while(($next = nextCard($card)) !== undefined) {
			console.log('checking ' + cardName($next));
			//determine how this card relates to the previous one
			if((numbers.indexOf($next.attr('number')) === numbers.indexOf($card.attr('number'))+1
				|| ($card.attr('number') === 'Ace' && $next.attr('number') === 'Two'))
				&& $next.attr('suit') === $card.attr('suit'))
				curMatch = 'run';
			else if($next.attr('number') === $card.attr('number'))
				curMatch = 'group';
			else curMatch = '';
			console.log('curMatch: ' + curMatch + ', setType: ' + setType + ', setSize: ' + setSize);
			//determine what that means in the scheme of things
			if(setType === '') { //no current running set
				if(curMatch === '') return win=false;
				else {
					setType = curMatch;
					setSize = 2;
				}
			}
			else if(curMatch === setType) setSize++; //extending the current set
			else if(setSize < 3) return win=false; //last set was < 3 cards and we didn't extend it
			else if(curMatch.length > 0 && setSize > 3) { //last set was > 3 cards, so we can spare the last card from it to start a new set
				setType = curMatch;
				setSize = 2;
			}else { //last set was 3 cards, so we have to start a new one
				setType = '';
				setSize = 1;
			}
			$card = $next;
		}
		if(setSize < 3) return win=false; //make sure we ended with a valid set
	});
	console.log('result: ' + win);
	if(win) {
		console.log('YOU WIN');
		victoryAnimation();
	}
//should we try to determine when the user has definitively lost? probably not.
/*	else if($('#stack > .inner').children().length === 0) {
		console.log('YOU LOSE');
		failureAnimation();
	}
//*/
	return win;
}

function victoryAnimation() {
	var $winMessage = $('#win_message');
	$winMessage.html('CONGRATULATIONS!');
	$winMessage.css({'visibility':'visible', 'font-size':''});
	$winMessage.animate({'font-size':'100px'}, 2000);
}
function failureAnimation() {
	var $winMessage = $('#win_message');
	$winMessage.html('SORRY, YOU LOSE.');
	$winMessage.css({'visibility':'visible', 'font-size':'100px'});
}

//all the setup is done from here
$(document).ready(function() {

	resetGame();
	
	//need this to allow right-clicks on cards
	$('#card_panel')[0].oncontextmenu = function(){return false;};

	//make sure no card thinks the mouse is pressed on it when it isn't
	$(document).mouseup(function(event) {
		$('.card[mousePressed="true"]').attr('mousePressed','false');
	});

	//start button toggles to the Reset button once the game is started
	$('#start_button').html('Deal Cards');
	$('#start_button').click(function() {
		if(!dealt) deal();
		else resetGame();
	});
	
	var toggle_rules = function() {
		var $msg = $('#rules_message');
		if($msg.css('visibility') !== 'visible')
			$msg.css({'visibility':'visible', 'pointer-events':'auto'});
		else $msg.css({'visibility':'', 'pointer-events':''});
	}
	$('#rules_button').click(toggle_rules);
	$('#rules_message').click(toggle_rules);
	
	//for real-time troubleshooting by logging the result of any line of JavaScript code
	$('#debug_text').keypress(function(e) {
		switch(e.which) {
			case 10:
			case 13:
				console.log(eval($(this).val()));
				break;
			default:
				break;
		}
	});
	
	//you can also hard-code a line to print out if you think eval() won't treat it properly
	$('#debug_button').click(function() {
		console.log(jQuery.data($('#stack > inner')[0],'masonry'));
	});
	
	//$('*').click(function() { console.log(this.tagName + '[' + this.id + ',' + this.className + ']')});
});

//fix for jQuery bug when setting 'scope' option for a droppable
//taken directly from http://stackoverflow.com/questions/3097332/jquery-drag-droppable-scope-issue
//submitted bug ticket http://bugs.jqueryui.com/ticket/9287
jQuery.fn.extend({

    setDroppableScope: function(scope) {
        return this.each(function() {
            var currentScope = $(this).droppable("option","scope");
            if (typeof currentScope == "object" && currentScope[0] == this) return true; //continue if this is not droppable

            //Remove from current scope and add to new scope
            var i, droppableArrayObject;
            for(i = 0; i < $.ui.ddmanager.droppables[currentScope].length; i++) {
                var ui_element = $.ui.ddmanager.droppables[currentScope][i].element[0];

                if (this == ui_element) {
                    //Remove from old scope position in jQuery's internal array
                    droppableArrayObject = $.ui.ddmanager.droppables[currentScope].splice(i,1)[0];
                    //Add to new scope
                    $.ui.ddmanager.droppables[scope] = $.ui.ddmanager.droppables[scope] || [];
                    $.ui.ddmanager.droppables[scope].push(droppableArrayObject);
                    //Update the original way via jQuery
                    $(this).droppable("option","scope",scope);
                    break;
                }
            }
        });
    }
});
