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
		$card = $('<div class="card" suit="' + suits[s] + '" number="' + numbers[n] + '" pile="stack"></div>');
		$card.append('<div><div>' + text + '</div></div>'); //see rummy.css - 2 nested divs required to center text within card
		//for each card, create an invisible 'target card' that will be used as the endpoint for animated movements between piles
		$card.data('targetCard', $card.clone().css('visibility','hidden'));
		//now add the card to the deck
		$('#stack > .inner').append($card);
		//clicking cards is how to play the game!
		$card.click(function() {
			console.log(cardName($(this)) + ' clicked');
			switch($(this).attr('pile')) {
				case 'stack':
					break;
				case 'hand': //move a clicked card from the hand to the temporary zone for building runs/sets
					moveCard($(this), 'set');
					break;
				case 'set':
					moveCard($(this), 'hand');
					break;
				default:
					break;
			}
		});
		console.log(cardName($card) + ' added data ' + cardName($card.data('targetCard')));
	}
}

function cardName($card) {
	return $card.attr('number') + ' of ' + $card.attr('suit');
}

/* move the specified .card div from one pile to another,
 * assuming there are already index cards in the destination pile,
 * and with a delay of delay milliseconds before the animation
 */
function moveCard($card, pile, index=-1, delay=0) {

	//put this card's invisible 'target card' into the destination slot so we know what coordinates to animate to
	var $div = $('#'+pile+' > .inner'), $targetCard = $card.data('targetCard');
	$targetCard.detach().appendTo($div);
	var curOffset = $card.offset(), newOffset = $targetCard.offset(), curPos = $card.position();
	console.log('moving ' + cardName($card) + ' by ' + (newOffset.top-curOffset.top) + ',' + (newOffset.left-curOffset.left));
	console.log('visible? ' + $card.css('visibility') + ', at ' + curOffset.top + ',' + curOffset.left + ', color ' + $card.css('background-color'));

	//if the current pile is a line of cards (hand/set), shift all cards to the right of this one left by one slot
	if($card.attr('pile') !== 'stack') {
		var $toRight = $card.nextAll('.card');
		//cache each card's current position so it isn't changed by starting to animate the one to the left of it
		$toRight.each(function(i) {
			$(this).data('curPos', $(this).position());
		});
		//now do the animation for all of them
		$toRight.each(function(i) {
			var $this = $(this), pos = $(this).data('curPos');
			var delta = $this.width()+parseInt($this.css('margin-left').slice(0,-2));
			$this.css('position','absolute');
			$this.css({'top': pos.top+'px', 'left': pos.left+'px'});
			console.log('shifting ' + cardName($this) + ' from ' + pos.top + ',' + pos.left + ' by ' + delta);
			$this.animate(
				{
					left:'-='+delta+'px'
				},
				{
					duration: 500,
					complete: function() {
						$this.css('position','');
					}
				}
			);
		});
	}

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
				$(this).css('position','');
				$targetCard.replaceWith($(this).detach());
			}
		});

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

function evalSet() {
	
}

function printPos($card) {
	console.log($card.attr('number') + ' of ' + $card.attr('suit') + ' at ' + $card.css('top') + ',' + $card.css('left') + ' under ' + $card.parent().attr('id'));
}

$(document).ready(function() {

	resetGame();
/*	$('.pile > inner').masonry({
		columnWidth: 1,
		itemSelector: '.card',
		isAnimated: true,
		animationOptions: {
			duration: 1000
		}
	});
//*/	
	$('#start_button').html('Deal Cards');
	$('#start_button').click(function() {
		if(!dealt) {
			//deal the top 7 cards from the stack
			var handPos = $('#hand').position();
			for(var i = 0; i < handSize; i++) {
				//var $card = $('.card:nth-child(' + (numCards-i) + ')');
				moveCard($('.card:nth-child(' + (numCards-i) + ')'), 'hand', i, i*150);
				//$card.detach().delay(200*i).appendTo('#hand > .inner');
				//$card.css('position','relative').css('display','inline-block');
				//printPos($card);
			}
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

