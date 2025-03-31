import { ref } from 'vue'
import { supabase } from '../supabase/config'

export function useFileStorage() {
  const uploading = ref(false)
  const error = ref(null)
  const progress = ref(0)
  
  // Upload a file to project storage
  const uploadFile = async (file, projectId, updateId = null) => {
    if (!file || !projectId) {
      error.value = 'File and project ID are required'
      return null
    }

    uploading.value = true
    error.value = null
    progress.value = 0
    
    try {
      console.log(`Starting upload for file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
      
      // Create a unique file path
      const filePath = `projects/${projectId}/${Date.now()}_${file.name}`
      
      // Upload the file to storage
      const { data, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onProgress: (event) => {
            // Calculate and update progress
            if (event.totalBytes) {
              progress.value = Math.round((event.loadedBytes / event.totalBytes) * 100)
            }
          }
        })
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw uploadError
      }
      
      console.log(`File uploaded to path: ${filePath}`)
      
      // Get the public URL for the file
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)
      
      if (!urlData || !urlData.publicUrl) {
        console.warn('Could not generate public URL for file')
      } else {
        console.log(`Generated URL: ${urlData.publicUrl}`)
      }
      
      // Create a record in the project_files table
      const fileData = {
        project_id: projectId,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        size_bytes: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        update_id: updateId,
        url: urlData?.publicUrl || null,
        created_at: new Date().toISOString()
      }
      
      console.log('Creating file record with data:', fileData)
      
      const { data: fileRecord, error: recordError } = await supabase
        .from('project_files')
        .insert(fileData)
        .select()
        .single()
      
      if (recordError) {
        console.error('Database file record error:', recordError)
        throw recordError
      }
      
      console.log('File record created successfully:', fileRecord)
      return fileRecord
    } catch (err) {
      console.error('Error uploading file:', err)
      error.value = err.message
      return null
    } finally {
      uploading.value = false
    }
  }
  
  // Download a file from storage
  const downloadFile = async (filePath) => {
    error.value = null;
    
    try {
      if (!filePath) {
        error.value = 'File path is required';
        return null;
      }

      // Check if file path is actually a URL
      if (filePath.startsWith('http')) {
        window.open(filePath, '_blank');
        return true;
      }

      const { data, error: downloadError } = await supabase.storage
        .from('project-files')
        .download(filePath);
      
      if (downloadError) throw downloadError;
      
      // Create a blob URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      
      // Extract filename from path
      const filename = filePath.split('/').pop();
      
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      return true;
    } catch (err) {
      console.error('Error downloading file:', err);
      error.value = err.message;
      return false;
    }
  }
  
  // Get a temporary URL for a file
  const getFileUrl = (filePath) => {
    if (!filePath) return null
    
    const { data } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)
    
    return data?.publicUrl
  }
  
  // Delete a file from storage
  const deleteFile = async (filePath, fileId) => {
    if (!filePath || !fileId) {
      error.value = 'File path and ID are required'
      return false
    }
    
    error.value = null
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath])
      
      if (storageError) throw storageError
      
      // Delete the database record
      const { error: recordError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)
      
      if (recordError) throw recordError
      
      return true
    } catch (err) {
      console.error('Error deleting file:', err)
      error.value = err.message
      return false
    }
  }
  
  // Function to update the URL for an existing file record
  const updateFileUrl = async (fileId, filePath) => {
    if (!fileId || !filePath) {
      error.value = 'File ID and path are required'
      return false
    }
    
    error.value = null
    
    try {
      // Generate the public URL
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)
      
      if (!data || !data.publicUrl) {
        console.warn('Could not generate public URL for file')
        return false
      }
      
      // Update the record
      const { error: updateError } = await supabase
        .from('project_files')
        .update({ url: data.publicUrl })
        .eq('id', fileId)
      
      if (updateError) {
        console.error('Error updating file URL:', updateError)
        return false
      }
      
      return true
    } catch (err) {
      console.error('Error updating file URL:', err)
      error.value = err.message
      return false
    }
  }
  
  // Batch update multiple file URLs
  const updateMissingFileUrls = async (files) => {
    if (!files || !files.length) return
    
    const updatePromises = files
      .filter(file => !file.url && file.file_path)
      .map(file => updateFileUrl(file.id, file.file_path))
    
    return Promise.all(updatePromises)
  }
  
  return {
    uploading,
    error,
    progress,
    uploadFile,
    downloadFile,
    getFileUrl,
    deleteFile,
    updateFileUrl,
    updateMissingFileUrls
  }
} 