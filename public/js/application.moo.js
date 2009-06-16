window.addEvent('domready', function() {
  GetVid.init();
});

var GetVid = {
  init: function(){
    if (this.current_path_is('/')) {
      this.video_lists = {}
      this.video_lists.completed = new VideoList('completed');
      if ($('queued')) this.video_lists.queued = new VideoList.Queued('queued')
      this.new_video = new NewVideo();
    };
  },
  
  current_path_is: function(path){
    return window.location.pathname == path;
  }
}

var Visibility = new Class({
  initialize: function(element){
    this.element = element;
  },
  visible: function(){
    return this.element.getStyle('display') != 'none';
  },
});

var Toggleable = new Class({
  Extends: Visibility,
  initialize: function(element, ifVisible, ifInvisible, binding){
    this.parent(element);
    this.ifVisible = ifVisible;
    this.ifInvisible = ifInvisible;
    this.binding = binding;
  },
  toggle: function(){
    if (this.visible()) {
      this.ifVisible.bind(this.binding).call();
    } else {
      this.ifInvisible.bind(this.binding).call();
    };
  }
})

var VideoList = new Class({
  Extends: Toggleable,
  initialize: function(id) {
    this.table = $(id);
    this.parent(this.table, function() {
      // visible
      this.table.setStyle('display', 'none');
      this.nav_link.removeClass('selected');
    }, function() {
      // invisible
      this.table.setStyle('display', 'table');
      this.nav_link.addClass('selected')
    }, this);
    this.nav_link = $(id + "_link");
    this.container = this.table.getParent('div');
    this.thead = this.table.getElement('.head');
    
    this.number = this.container.getChildren('h1')[0].getChildren('.number')[0]
    this.count = parseInt(this.number.get('text'));
    
    this.setup();
  },
    
  setup: function() {
    this.nav_link.addEvent('click', this.toggle.bind(this));
  },
  
  incrementCount: function(){
    this.count++
    this.number.set('text', this.count)
    return this.count;
  },
  
  decrementCount: function() {
    this.count--
    this.number.set('text', this.count)
    return this.count;
  },
  
  toggle: function() {
    this.parent();
    return false;
  },
  
  hide: function(){
    this.container.setStyle('display', 'none')
    this.nav_link.setStyle('display', 'none')
  },
  
  show: function(){
    this.container.setStyle('display', 'block')
    this.nav_link.setStyle('display', 'block')
  }
});

VideoList.Queued = new Class({
  Extends: VideoList,
  initialize: function(id){
    this.parent(id);
    setInterval(this.update_status.bind(this), 3000)
  },
  
  videos: function(){
    return this.table.getElements("tr:not('.head')");
  },
  
  video_ids: function(){
    var ids = [];
    this.videos().each(function(vid) {
      ids.push(vid.get('id').split(/video_/)[1]);
    });
    return ids;
  },
    
  update_status: function(){
    if (this.videos().length > 0) {
      var video_ids = []
      this.video_ids().each(function(id) {
        video_ids.push("ids[]=" + id)
      });
      
      new Request.JSON({
        url: "/videos/progress.json",
        data: video_ids.join("&"),
        onSuccess: function(data){
          data.each(function(vid) {
            var element = $("video_" + vid.id);
            var status = element.getChildren('.status')[0];
            if (status.get('text').toLowerCase() != vid.current_state) {
              status.set('text', vid.current_state);
              element.highlight();
            };
            if (vid.current_state == 'complete') {
              element.inject(GetVid.video_lists.completed.thead, 'after')
              GetVid.video_lists.completed.incrementCount();
              GetVid.video_lists.queued.decrementCount();
            }
          });
        }
      }).get();
    };
  },
})

var NewVideo = new Class({
  Extends: Toggleable,
  initialize: function(){
    this.element = $('new_video');
    this.parent(this.element, function() {
      // visible
      this.nav_link.removeClass('selected');
      this.element.setStyle('display', 'none');
    }, function() {
      // invisible
      this.nav_link.addClass('selected');
      this.element.setStyle('display', 'block');
    }, this);
    this.nav_link = $('new_video_link');
    this.cancel_link = this.element.getElements('.cancel')[0];
    
    this.nav_link.addEvent('click', this.toggle.bind(this));
    this.cancel_link.addEvent('click', this.toggle.bind(this));
    this.toggle();
  },
  
  toggle: function(){
    this.parent();
    return false;
  }
});
