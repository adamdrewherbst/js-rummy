//global game specs
suits = ['Clubs', 'Spades', 'Diamonds', 'Hearts']
numbers = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace']
var numCards = suits.length * numbers.length, handSize = 7, dealt = false;

function resetGame() {
	//generate all 52 cards as a stack on the upper left
	dealt = false;
	$('div.pile > .inner').empty();
	$stack = $('#stack');
	console.info($('#stack > .inner').position(), $('#stack > .inner').offset());
	var cards = []
	for(var i = 0; i < numCards; i++) cards.push(i);
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
		//for each card, create an invisible 'target card' that will be used as the endpoint for animated movements between piles...
		$card.data('targetCard', $card.clone().css('visibility','hidden'));
		//now add the card to the deck
		$('#stack > .inner').append($card);
		//clicking cards is how to play the game!
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
				console.log(cardName($(this)) + ' ready to receive ' + cardName(ui.draggable));
			},
			drop: function(event,ui) {
				var $this = $(this), $other = ui.draggable, $before;
				console.log(cardName($other) + ' dropped onto ' + cardName($this) + ' from ' + JSON.stringify(ui.helper.position()));
				if(getPile($other) !== getPile($this) || $other.index() > $this.index())
					$before = $this;
				else {
					$before = nextCard($this);
				}
				//start the animation from the position of the 'helper' that the user is dragging
				moveCard($other, getPile($this), 0, $before, ui.helper.position());
			},
		});
		$card.mousedown(function(event) {
			$(this).attr('mousePressed','true');
			return true;
		});
		$card.mouseup(function(event) {
			if($(this).attr('mousePressed') !== 'true') return true;
			console.log(cardName($(this)) + ' clicked');
			$(this).attr('mousePressed','false');
			switch(getPile($(this))) {
				case 'stack':
					break;
				case 'hand': //move a clicked card from the hand to the temporary zone for building runs/sets
					if(event.which === 1 || event.button === 1) moveCard($(this), 'set');
					else {
						moveCard($(this), 'discard');
						dealCard();
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
}

function cardName($card) {
	return $card.attr('number') + ' of ' + $card.attr('suit');
}

function getPile($card) {
	return $card.parents('.pile').attr('id');
}

function dealCard(delay=0) {
	var $topCard = $('#stack > .inner > .card[dealt="false"]').last();
	$topCard.attr('dealt','true');
	moveCard($topCard, 'hand', delay);
}

//move the specified .card div from one pile to another, after a delay of delay milliseconds
function moveCard($card, pile, delay=0, $before=undefined, from={}) {

	/* here is the protocol: 
	 *   1) identify all cards that will need to move ($card and all those to the right of it in its current pile)
	 *   2) switch these all to absolute position so we can animate their top and left properties
	 *   3) place all their target cards at their destination as a placeholder/indicator of where to move to
	 *   4) perform the animations
	 */
	 
	/* STEP 1 */
	//if the current pile is a line of cards (hand/set), all cards to the right of this one must shift left by one slot
	var $curPile = $('#' + getPile($card) + ' > .inner'), $movingCards = $card;
	var $newPile = $('#' + pile + ' > .inner');
	$card.attr('moving','true');
	if($curPile.css('position') !== 'absolute' || $newPile.css('position') !== 'absolute') {
		if(!$curPile.is($newPile)) {
			$movingCards = $movingCards.add($card.nextAll('.card[moving="false"]').filter(function() {
				return typeof $(this).data('targetCard') != 'undefined'; }));
			if($before !== undefined && $newPile.css('position') !== 'absolute')
				$movingCards = $movingCards.add($before.add($before.nextAll('.card[moving="false"]').filter(function() {
					return typeof $(this).data('targetCard') != 'undefined'; })));
		}else {
			var start, end;
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
	//get all the target cards in place so we know their positions
	$movingCards.each(function(i) {
		var $this = $(this), $target = $this.data('targetCard').detach().css({'position':'','top':'0','left':'0'});
		if(!($this.is($card))) $target.insertAfter($this);
		else {
			if($before === undefined) $target.appendTo($newPile);
			else $target.insertBefore($before);
		}
	});
	//do the animation!
	$movingCards.each(function(i) {
		var $this = $(this), $target = $this.data('targetCard');
		var pos = $(this).data('curPos');
		var deltaTop = $target.offset().top - $this.offset().top, deltaLeft = $target.offset().left - $this.offset().left;
		console.log('moving ' + cardName($this) + ' from ' + pos.top + ',' + pos.left + ' by ' + deltaTop + ',' + deltaLeft);
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
				}
			}
		);
	});

	/**** now take care of the card we want to move *****/
	//put this card's invisible 'target card' into the destination slot so we know what coordinates to animate to
/*	var $div = $('#'+pile+' > .inner'), $targetCard = $card.data('targetCard');
	$targetCard.detach().css({'top':'0','left':'0'}).appendTo($div);
	var curOffset = $card.offset(), newOffset = $targetCard.offset(), curPos = $card.position();
	console.log('moving ' + cardName($card) + ' by ' + (newOffset.top-curOffset.top) + ',' + (newOffset.left-curOffset.left));
	console.log('visible? ' + $card.css('visibility') + ', at ' + curOffset.top + ',' + curOffset.left + ', color ' + $card.css('background-color'));
	$card.css('position','absolute'); //change position to absolute so we can animate its top and left properties
	$card.css({'top': curPos.top+'px', 'left': curPos.left+'px'}); //make sure it stays in place when we make this change
	$card.stop().delay(delay).animate(
		{
			'top':'+='+(newOffset.top-curOffset.top)+'px',
			'left':'+='+(newOffset.left-curOffset.left)+'px'
		}, 
		{
			duration: 1000,
			complete: function() {
				//once this card gets to its destination, replace the clone with it
				console.log(cardName($card) + ' done');
				$(this).attr('pile',pile);
				$(this).css({'position':''});
				$targetCard.replaceWith($(this).detach());
				$(this).css({'top':'0','left':'0'});
			}
		}
	);

//*/

	//determine which cards in its current pile are to its right
	//-these will have to be shifted left once it is moved
/*	var curPile = $card.attr('pile'), curLeft = $card.position().left;
	var $toRight;
	if(curPile !== 'stack') $toRight = $('.card[pile="'+curPile+'"]').filter(function() {
		return $(this).position().left > curLeft;
	});
	//determine where the card should go
	var pos = $('div #'+pile).position();
	if(index < 0) index = $('.card[pile="'+pile+'"]').length;
	var width = parseInt($card.css('width').replace('px','').replace('em',''));
	var margin = parseInt($card.css('margin-left').replace('px','').replace('em',''));
	var newTop = pos['top'], newLeft = pos['left'] + index * (width + margin);
	//animate the motion
	console.log(cardName($card) + ' to ' + newTop + ',' + newLeft);
	console.log(width + ',' + margin);
	$card.attr('pile',pile);
	$card.delay(delay).animate({top:''+newTop+'px', left:''+newLeft+'px'}, 1000);
	//adjust for the newly created gap in the card's old pile
	if(curPile !== 'stack') $toRight.animate({left:'-='+(width+margin)+'px'}, 500);
//*/
}

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
	console.log($card.attr('number') + ' of ' + $card.attr('suit') + ' at ' + $card.css('top') + ',' + $card.css('left') + ' under ' + $card.parent().attr('id'));
}

$(document).ready(function() {

	$('#card_panel')[0].oncontextmenu = function(){return false;};

	resetGame();
	
	$(document).mouseup(function(event) {
		$('.card[mousePressed="true"]').attr('mousePressed','false');
	});

	$('#start_button').html('Deal Cards');
	$('#start_button').click(function() {
		if(!dealt) {
			//deal the top 7 cards from the stack
			for(var i = 0; i < handSize; i++) dealCard(i*150);
			this.textContent = 'Reset Game';
			dealt = true;
		}else {
			resetGame();
			this.textContent = 'Deal Cards';
		}
	});
	
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
	
	$('#debug_button').click(function() {
		console.log(jQuery.data($('#stack > inner')[0],'masonry'));
	});
	
	//$('*').click(function() { console.log(this.tagName + '[' + this.id + ',' + this.className + ']')});
});

//fix for jQuery bug when setting 'scope' option for a droppable
//taken directly from http://stackoverflow.com/questions/3097332/jquery-drag-droppable-scope-issue
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
