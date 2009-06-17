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
    GetVid.queue_poller = setInterval(this.update_status.bind(this), 3000)
    GetVid.stop_queue_poller = function() {
      clearInterval(GetVid.queue_poller);
    };
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
      var video_ids = this.video_ids().map(function(id) {
        return "ids[]=" + id;
      });
      
      var download_links_for = function(vid) {
        return this.download_links_for(vid);
      }.bind(this);
      
      new Request.JSON({
        url: "/videos/progress.json",
        data: video_ids.join("&"),
        onSuccess: function(data){
          data.each(function(vid) {
            new Video(vid).prepare();
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

var Video = new Class({
  initialize: function(attributes){
    for(key in attributes) {
      this[key] = attributes[key];
    }
    this.element = $("video_" + this.id);
    this.action_cell = this.element.getElement("td:last-child");
    this.status = this.element.getChildren('.status')[0];
  },
  
  prepare: function(){
    if (!this.status_equals_current_state()) {
      this.status.set('text', this.current_state);
      this.element.highlight();
    };
    
    if (this.current_state == 'complete') {
      this.element.inject(GetVid.video_lists.completed.thead, 'after')
      this.download_links().inject(this.element.getElement('.video'), 'bottom');
      this.delete_link().inject(this.action_cell, 'top');
      GetVid.video_lists.completed.incrementCount();
      GetVid.video_lists.queued.decrementCount();
    }
  },
  
  status_equals_current_state: function(){
    return this.status.get('text').toLowerCase() == this.current_state;
  },
  
  download_links: function(){
    var container = new Element('dl', {'class': 'download_links'});
    var dt = new Element('dt', {'text': 'Download Links:'});
    var links = [{name: 'Video',     extension: '.mp4', path: '/output/Video/'},
                 {name: 'Raw Audio', extension: '.aif', path: '/output/Audio/'},
                 {name: 'MP3 Audio', extension: '.mp3', path: '/output/Audio/'}].map(function(link_config) {
      var file = link_config.path + this.filename + link_config.extension;
      var dd = new Element('dd');
      var a = new Element('a', {
        'text': link_config.name,
        'title': link_config.name + ': ' + file,
        'href': file
      });
      a.inject(dd);
      return dd;
    }, this);
    
    links.each(function(link) {
      link.inject(container, 'top');
    });
    dt.inject(container, 'top');
    return container;
  },
  
  delete_link: function(){
    return new Element('a', {
      'text': 'Delete',
      'href': '/videos/' + this.id + '/delete'
    })
  },
})
