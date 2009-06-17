require 'rubygems'
require 'haml'
require 'json'
require 'datamapper'
require 'yaml'

Dir[File.join(File.dirname(__FILE__), 'vendor/**/lib')].each do |dir|
  $LOAD_PATH << dir
end

require 'will_paginate'
require 'will_paginate/finders/data_mapper'
require 'will_paginate/view_helpers/base'
require 'will_paginate/view_helpers/link_renderer'

require 'sinatra'

Dir[
  File.join(File.dirname(__FILE__), 'vendor/**/lib/*.rb'),
  File.join(File.dirname(__FILE__), "models/*.rb"),
  File.join(File.dirname(__FILE__), "helpers/*.rb")
].each { |f| require f }

DATABASE_DIR = File.expand_path(File.join(File.dirname(__FILE__), 'db'))
ENVIRONMENT = ENV["SINATRA_ENV"] || ENV["RACK_ENV"] || :development
USERS_FILE = File.expand_path(File.join(File.dirname(__FILE__), 'db/users.yml'))
USERS = YAML.load(File.open(USERS_FILE)) if File.exists?(USERS_FILE)

set :environment, ENVIRONMENT
set :root, File.dirname(__FILE__)

configure do
  GetVid.configure do |config|
    config.output_dir = File.join(File.dirname(__FILE__), 'public/output')
  end
end

configure :development do
  DataMapper.setup(:default, "sqlite3:///#{DATABASE_DIR}/development.db")
  DataMapper.auto_migrate!

  FileUtils.rm_rf File.join(File.dirname(__FILE__), 'public/output')
  GetVid.configure do |config|
    config.output_dir = File.join(File.dirname(__FILE__), 'public/output')
  end
end

configure :production do
  DataMapper.setup(:default, "sqlite3:///#{DATABASE_DIR}/production.db")
  DataMapper.auto_upgrade!
  
  if USERS
    use Rack::Auth::Basic do |username, password|
      USERS[username] && USERS[username]['password'] == password
    end
  end
end

mime :json, "application/json"

get '/' do
  @completed_videos = Video.paginate({
    :state          => 'complete', 
    :order          => [:created_at.desc], 
    :page           => params[:completed_page], 
    :per_page       => 8
  })
  @queued_videos    = Video.paginate({
    :state.not      => 'complete', 
    :page           => params[:queued_page], 
    :per_page       =>  5
  })
  haml :index
end

post '/videos' do
  Video.create_from_urls(params[:vids][:urls])
  redirect '/'
end

get '/videos/:id/delete' do
  vid = Video.get(params[:id])
  delete_output_file(vid.filename + '.aif')
  delete_output_file(vid.filename + '.mp3')
  delete_output_file(vid.filename + '.mp4')
  vid.destroy
  redirect '/'
end

get '/videos/progress.json' do
  content_type = :json
  vids = if params[:ids]
    Video.all(:id.in => params[:ids])
  else
    Video.all
  end
  vids.to_json(:methods => [:current_state, :filename])
end

delete '/videos/:id' do
  @video = Video.get(params[:id]).destroy
  redirect '/'
end

WillPaginate::ViewHelpers::LinkRenderer.class_eval do
  protected
  def url(page)
    url = @template.request.url
    page_rxp = Regexp.new("#{@options[:param_name]}=[0-9]+")
    if page == 1
      # strip out page param and trailing ? if it exists
      url.gsub(page_rxp, '').gsub(/\?$/, '')
    else
      if url =~ page_rxp
        url.gsub(page_rxp, "#{@options[:param_name]}=#{page}")
      else
        url + "?#{@options[:param_name]}=#{page}"
      end      
    end
  end
end

helpers do
  def partial(page, options={})
    haml page, options.merge!(:layout => false)
  end
  
  include WillPaginate::ViewHelpers::Base
  include VideoHelpers
end
