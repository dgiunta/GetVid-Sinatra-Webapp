class Video
  include DataMapper::Resource
  
  property :id, Serial
  property :created_at, DateTime
  property :url, String
  property :title, String
  property :cached_filename, String
  property :state, String
  
  def self.create_from_urls(urls)
    urls.split(/\r?\n|, | /).each do |url|
      new(:url => url, :state => 'new').save!
    end
  end
  
  def get_vid_video
    @get_vid_video ||= GetVid::Video.create(self.url)
  end
  
  def cached_title
    if title.nil?
      self.title = get_vid_video.send(:title)
      save!
    end
    title
  end
  
  def current_state
    @current_state = self.state.to_s.gsub(/_/, ' ')
  end
  
  def process!
    case state
    when 'new'
      set_state_to('downloading')
      run_action(:download)
      set_state_to('downloaded')
    when 'downloaded'
      set_state_to('exporting_audio')
      run_action(:export_audio)
      set_state_to('audio_exported')
    when 'audio_exported'
      set_state_to('converting_audio')
      run_action(:convert_audio_to_mp3)
      set_state_to('audio_converted')
    when 'audio_converted'
      set_state_to('complete')
    end
  end
  
  def run_action(action)
    puts "running #{action}"
    self.send(action)
  end
  
  def set_state_to(state)
    print "setting state to #{state}: "
    self.state = state
    puts self.save!
  end
  
  def filename
    if cached_filename.nil?
      attribute_set(:cached_filename, get_vid_video.send(:formatted_filename))
      save!
    end
    cached_filename
  end
  
  def method_missing(method, *args)
    if get_vid_video.respond_to?(method)
      get_vid_video.send(method, *args)
    else
      super
    end
  end
end
