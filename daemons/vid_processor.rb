#!/usr/bin/env ruby

require File.join(File.dirname(__FILE__), '../get_vid')

puts ENVIRONMENT.to_s

loop do
  vids = Video.all(:state.not => 'complete')
  puts "processing #{vids.length} videos" if vids.length > 0
  vids.each { |vid| vid.process! }
  sleep_time = if ENVIRONMENT.to_s == "development"
    10
  else
    vids.length > 0 ? 60 : 10
  end
  
  sleep sleep_time
end
