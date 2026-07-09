(function($){

$( document ).ready(function() {

  checkSize();
  $(window).resize(checkSize);

  // swap feed / cards...
  $(".css_grid_text_container" || ".css_grid_card_container").click(function(){
    // $(".__feed__container").addClass('css_tag_container')
    $(".css__feed__container").removeClass('feed-dn')
    $(".css_grid_container").addClass('grid-dn')
    var projectNameStr = $(this).closest('.css_grid_card_container').attr('name')
    // console.log($(".css_feed_project_container[name=" + projectNameStr +"]").attr('name'));
    // console.log($(".css_feed_project_container[name=" + projectNameStr +"]"));
    setTimeout(function(){
      $(".css_feed_project_container[name=" + projectNameStr +"]").get(0).scrollIntoView();

    },100)
  })


  // tags ------ START
  var iScrollPos = 0;
  $(window).scroll(function () {
    var iCurScrollPos = $(this).scrollTop();
    if (iCurScrollPos > iScrollPos) {
      $(".css_tag_container").removeClass("__tag__opacity");
    }
    else {
      $(".css_tag_container").addClass("__tag__opacity");
    }
    iScrollPos = iCurScrollPos;
  });
  $(".css_header, css_tag_container").mouseover(function(){
    if($(".css_tag_container").hasClass("__tag__opacity")){
    }
    else{
      $('.css_tag_container').addClass('__tag__opacity')
    }
  })
  $(".css_header").mouseout(function(){
    // $('.css_tag_container').removeClass('__tag__opacity')
  })

  $('.css_tag_item').click(function(){
    if($(this).hasClass("css_tag_item_inactive")) {
      $(".css_tag_item_active").removeClass('css_tag_item_active').addClass('css_tag_item_inactive');
      $('.css_grid_card_container, .css_feed_project_container').removeClass('tag-dn')
      $(this).removeClass('css_tag_item_inactive').addClass('css_tag_item_active');
      var tagTextItem = $(this).data('tag')
      // console.log(tagTextItem)
      $('.css_grid_card_container:not([' + tagTextItem + '])').addClass('tag-dn')
      $('.css_feed_project_container:not([' + tagTextItem + '])').addClass('tag-dn')
      $(window).scrollTop(0)
      $(".css_feed_project_container").find(".css_feed_text_container").css('display','none');
      $(".css_feed_project_container").find('.css_feed_photo_container').removeClass("feed-dn");
      $(".css_feed_project_container").find('.css_feed_draw_container').removeClass("feed-dn");
      $(".css__feed__container").addClass("feed-dn");
      $(".css_grid_container").removeClass("grid-dn");


    }else{
      $(".css_tag_item_active").removeClass('css_tag_item_active').addClass('css_tag_item_inactive');
      // $('.css_grid_card_container').removeClass('tag-dn')
      $('.css_grid_card_container, .css_feed_project_container').removeClass('tag-dn')
      $(window).scrollTop(0)
      $(".css_feed_project_container").find(".css_feed_text_container").css('display','none');
      $(".css_feed_project_container").find('.css_feed_photo_container').removeClass("feed-dn");
      $(".css_feed_project_container").find('.css_feed_draw_container').removeClass("feed-dn");
      $(".css__feed__container").addClass("feed-dn");
      $(".css_grid_container").removeClass("grid-dn");


      // $(this).removeClass('css_tag_item_active').addClass('css_tag_item_inactive');
      // var tagTextItem = $(this).text()
      // $('.css_grid_card_container:not([' + tagTextItem + '])').removeClass('tag-dn')
    }
  })
  // tags ------ END


  $(".css_feed_footer_item_link").click(function() {
    $(this).closest(".css_feed_project_container").find(".css_feed_text_container").css('display','inherit');
    $(this).closest(".css_feed_project_container").find('.css_feed_photo_container').addClass("feed-dn");
    $(this).closest(".css_feed_project_container").find('.css_feed_draw_container').addClass("feed-dn");
    $(this).closest(".css_feed_project_container").get(0).scrollIntoView();
  });
  $(".css_feed_text_container").click(function() {
    $(this).css('display','none');
    $(this).closest(".css_feed_project_container").find('.css_feed_photo_container').removeClass("feed-dn");
    $(this).closest(".css_feed_project_container").find('.css_feed_draw_container').removeClass("feed-dn");
    $(this).closest(".css_feed_project_container").get(0).scrollIntoView();
    $(this).closest(".css_feed_project_container").next().find(".css_feed_photo_container").removeClass("card-shadow");
    if( $(this).closest('.css_feed_project_container').attr('id') == $('.css_feed_project_container').first().attr('id')){
      $('.nav-header-right').addClass("nav-bg");
      }
    if( $(this).closest('.css_feed_project_container').attr('id') == $('.css_feed_project_container').last().attr('id')){
      $('.nav-footer').removeClass("nav-bg-footer");
      $('.nav-footer-right').addClass("nav-bg-footer");
      }

  });



  // $('.__feed__photo__item, .__feed__draw__item').click(function(){
  $('.css_feed_photo_item, .css_feed_draw_item').click(function(){
      var project = $(this).closest('.css_feed_project_container');
      var projectName = project.prop('id');
      // console.log(projectName);
      var projectObject = findProject(jsonPhoto,projectName);
      // console.log(jsonPhoto);
      var projectName = String(projectName);

      var hasID = $(this).attr('id');
      if( hasID == 'photograph' ){
        var name = projectName;
        var currentProject = projectObject[name];
        var projectPhotos = currentProject["photographs"];
        var thisImage = $(this).attr('style');
        // Match URL inside background-image:url(...). Works for absolute and relative paths.
        var _m = thisImage.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
        var thisImage = _m && _m[1];
        // console.log(projectPhotos);
        // console.log(thisImage);
        var imageIndex = projectPhotos.indexOf(thisImage);
        // console.log(imageIndex);
        // console.log(projectPhotos.length);
        var imagePreloader = imageIndex + 1;

        if(imageIndex < projectPhotos.length - 1){
          imageIndex ++;
          if( imagePreloader == projectPhotos.length - 1){
            imagePreloader = 0;
          }else{
            imagePreloader ++;
          }

        }
        else{
          imageIndex = 0;
          imagePreloader = 1;
        }
        var projectFooterCounter = $(this).siblings().find('.css_feed_footer_wrapper');
        projectFooterCounter.find('.css_feed_footer_item_current').removeClass('css_feed_footer_item_current black-60').addClass('css_feed_footer_item black-20');
        projectFooterCounter.children().eq(imageIndex).removeClass('css_feed_footer_item black-20').addClass('css_feed_footer_item_current black-60');

        $(this).removeClass('fadein');
        $(this).siblings('.css_feed_photo_preload').attr('style', 'background-image:url(' + projectPhotos[imagePreloader] + ' );' );
        $(this).animate( {
          opacity: 0
        }, 200, function() {
          $(this).attr('style', 'opacity:0;background-image:url(' + projectPhotos[imageIndex] + ')' ).delay(200);
          $(this).animate( {
            opacity: 1
          }, 400);
        });


      } else if( hasID == 'drawing' ){
          var name = projectName;
          var currentProject = projectObject[name];
          var projectPhotos = currentProject["drawings"];
          var thisImage = $(this).attr('style');
          var _m = thisImage.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
          var thisImage = _m && _m[1];
          // console.log(projectPhotos);
          // console.log(thisImage);
          var imageIndex = projectPhotos.indexOf(thisImage);
          // console.log(imageIndex);
          // console.log(projectPhotos.length);
          var imagePreloader = imageIndex + 1;


          if(imageIndex < projectPhotos.length - 1){
            imageIndex ++;
            if( imagePreloader == projectPhotos.length - 1){
              imagePreloader = 0;
            }else{
              imagePreloader ++;
            }
          }
          else{
            imageIndex = 0;
            imagePreloader = 1;
          }
          var drawprojectFooterCounter = $(this).siblings().find('.css_feed_footer_wrapper');
          drawprojectFooterCounter.find('.css_feed_footer_item_current').removeClass('css_feed_footer_item_current black-60').addClass('css_feed_footer_item black-20');
          drawprojectFooterCounter.children().eq(imageIndex).removeClass('css_feed_footer_item black-20').addClass('css_feed_footer_item_current black-60');

          $(this).siblings('.css_feed_draw_preload').attr('style', 'background-image:url(' + projectPhotos[imagePreloader] + ' );' );
            $(this).attr('style', 'background-image:url(' + projectPhotos[imageIndex] + ')' );

          var projectFooterCounter = $(this).siblings().find('.counter');
          var counterText = projectFooterCounter.text();
          counterTotal = counterText.substring(2);
          var photoCount = ("00" + (imageIndex + 1)).slice(-2);
          photoCount = photoCount.toString().concat(counterTotal);
          projectFooterCounter.text(photoCount);
      }
  });
});


function findProject(object,query) {
  for(var i in object){
    if(query in object[i]) {
      return object[i];
    }
  }
}


function checkSize(){

  var mobileTest = $(".mobile-test").css("width");
  var mobile = mobileTest == "0px";
  var tablet = mobileTest == "1px";
  var laptop = mobileTest == "2px";
  var desktop = mobileTest == "3px";

  if (window.jsonShowImages || window.jsonShowImagesMobile){
    if (mobile) {
      if($(".css_feed_text_footer_description_item").text() != jsonShowImagesMobile ){
        $(".css_feed_text_footer_description_item").text(jsonShowImagesMobile)
      }
    }
    else if (tablet || laptop || desktop) {
      if($(".css_feed_text_footer_description_item").text() != jsonShowImages ){
        $(".css_feed_text_footer_description_item").text(jsonShowImages)
      }
    }
  }

}
}(jQuery));

document.addEventListener("touchstart", function(){}, true);
