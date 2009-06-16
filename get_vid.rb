Dir[File.join(File.dirname(__FILE__), 'vendor/**/lib')].each do |dir|
  $LOAD_PATH << dir
end

require 'rubygems'
require 'haml'
require 'datamapper'
require 'will_paginate'
require 'will_paginate/finders/data_mapper'
require 'json'
require 'sinatra'

Dir[
  File.join(File.dirname(__FILE__), 'vendor/**/lib/*.rb'),
  File.join(File.dirname(__FILE__), "models/*.rb"),
  File.join(File.dirname(__FILE__), "helpers/*.rb")
].each { |f| require f }

DATABASE_DIR = File.expand_path(File.join(File.dirname(__FILE__), 'db'))
ENVIRONMENT = ENV["SINATRA_ENV"] || :development

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
  
  use Rack::Auth::Basic do |username, password|
    username == 'joey' && password == 'giunta' ||
    username == 'dgiunta' && password == '071678'
  end
end

mime :json, "application/json"

helpers do
  include VideoHelpers
end

get '/' do
  @completed_videos = Video.all(:state => 'complete', :order => [:created_at.desc])
  @queued_videos    = Video.all(:state.not => 'complete')
  haml :index
end

post '/get_vids' do
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