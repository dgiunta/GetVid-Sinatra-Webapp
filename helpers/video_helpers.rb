module VideoHelpers
  def video_lists
    %W[ queued completed].inject([]) do |lists, list|
      lists << {
        :name => list, 
        :videos => video_list_hashes[list.to_sym]
      } if video_list_hashes.keys.include?(list.to_sym)
      lists
    end
  end
  
  def video_list_hashes
    lists = {}
    lists[:queued] = @queued_videos unless @queued_videos.empty?
    lists[:completed] = @completed_videos
    lists
  end
  
  def video_list_title_for(name)
    number = video_list_hashes[name.to_sym].total_entries
    "There #{are_or_is_for(number)} <span class='number'>#{number}</span> #{name} #{pluralize('video', number)}"
  end
  
  def are_or_is_for(number)
    number == 0 || number > 1 ? 'are': 'is'  
  end
  
  def pluralize(word, number)
    number == 0 || number > 1 ? word + 's' : word
  end
  
  def output_path_to(filename)
    File.join(options.root, 'public/output/', filename)
  end
  
  def public_output_path_to(filename)
    "/output/#{filename}"
  end
  
  def delete_output_file(filename)
    File.rm(output_path_to(filename)) if File.exists?(output_path_to(filename))
  end
end