var slide = null

const showImageGallery = function(srcList) {
	html = '';
	srcList.forEach(function(src) {
		html += '<div>'
			+ '<img src="'+src+'" onclick="window.open(\''+src+'\')">'
			+ '</div>'
	});

	$('#image-gallery').html(html)
	$('#image-gallery').css('width', window.innerWidth * 0.7 + 'px')

	if(slide)
		slide.slick('unslick')

	slide = $('#image-gallery').slick({
		dots: true,
		infinite: true,
		speed: 500,
		fade: true,
		cssEase: 'linear',
		respondTo: 'slider'
	});

	$('#image-popup').show()
}

$('#image-gallery').click(function(event){
	event.stopPropagation();
})

$('#image-popup').click(function(){
	$(this).hide();
})