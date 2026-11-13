/** Limits shared by the feedback form and service. */
const feedbackConfig = {
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024,
  maxTotalSize: 25 * 1024 * 1024,
  maxMessageLength: 10000,
  maxTextAttachmentLength: 500000,
  // Match extensions as well as MIME types because mobile file pickers can leave File.type empty.
  fileTypes: {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    txt: 'text/plain',
    log: 'text/plain',
    json: 'application/json',
    pdf: 'application/pdf',
  } as Record<string, string>,
}

export default feedbackConfig
