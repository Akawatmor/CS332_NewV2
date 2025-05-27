const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DOCUMENTS_BUCKET;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

let connection = null;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }
  return connection;
}

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    acl: 'private',
    key: function (req, file, cb) {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.originalname}`;
      cb(null, `documents/${filename}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, XLS, PPT, images and text files are allowed.'));
    }
  }
});

exports.handler = async (event) => {
  console.log('Documents Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters;
    const queryStringParameters = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    const db = await getConnection();

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: ''
        };

      case 'GET':
        if (pathParameters && pathParameters.id) {
          if (pathParameters.action === 'download') {
            // Download document
            const [rows] = await db.execute(
              'SELECT * FROM documents WHERE documentId = ?',
              [pathParameters.id]
            );

            if (rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Document not found' })
              };
            }

            const document = rows[0];
            
            // Generate presigned URL for download
            const params = {
              Bucket: BUCKET_NAME,
              Key: document.s3Key,
              Expires: 3600, // 1 hour
              ResponseContentDisposition: `attachment; filename="${document.filename}"`
            };

            const downloadUrl = s3.getSignedUrl('getObject', params);

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ downloadUrl })
            };

          } else if (pathParameters.action === 'view') {
            // View document
            const [rows] = await db.execute(
              'SELECT * FROM documents WHERE documentId = ?',
              [pathParameters.id]
            );

            if (rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Document not found' })
              };
            }

            const document = rows[0];
            
            // Generate presigned URL for viewing
            const params = {
              Bucket: BUCKET_NAME,
              Key: document.s3Key,
              Expires: 3600 // 1 hour
            };

            const viewUrl = s3.getSignedUrl('getObject', params);

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ viewUrl })
            };

          } else {
            // Get specific document details
            const [rows] = await db.execute(
              'SELECT * FROM documents WHERE documentId = ?',
              [pathParameters.id]
            );

            if (rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Document not found' })
              };
            }

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(rows[0])
            };
          }
        } else {
          // Get all documents with optional filtering
          const { category, type, search, limit = 50, offset = 0 } = queryStringParameters;
          
          let query = 'SELECT * FROM documents WHERE 1=1';
          let params = [];

          if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
          }

          if (type && type !== 'all') {
            query += ' AND accessLevel = ?';
            params.push(type);
          }

          if (search) {
            query += ' AND (title LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
          }

          query += ' ORDER BY uploadedAt DESC LIMIT ? OFFSET ?';
          params.push(parseInt(limit), parseInt(offset));

          const [rows] = await db.execute(query, params);

          // Get total count for pagination
          let countQuery = 'SELECT COUNT(*) as total FROM documents WHERE 1=1';
          let countParams = [];

          if (category && category !== 'all') {
            countQuery += ' AND category = ?';
            countParams.push(category);
          }

          if (type && type !== 'all') {
            countQuery += ' AND accessLevel = ?';
            countParams.push(type);
          }

          if (search) {
            countQuery += ' AND (title LIKE ? OR description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
          }

          const [countRows] = await db.execute(countQuery, countParams);
          const total = countRows[0].total;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              data: rows,
              pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasNext: parseInt(offset) + parseInt(limit) < total
              }
            })
          };
        }

      case 'POST':
        // Upload new document
        return new Promise((resolve) => {
          upload.single('file')(event, {}, async (err) => {
            if (err) {
              resolve({
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: err.message })
              });
              return;
            }

            try {
              const file = event.file;
              const { title, description, category, type = 'general', accessLevel = 'all' } = body;

              if (!file || !title || !category) {
                resolve({
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ message: 'File, title, and category are required' })
                });
                return;
              }

              const documentId = uuidv4();
              const uploadedBy = event.requestContext?.authorizer?.claims?.sub || 'system';
              
              const insertQuery = `
                INSERT INTO documents (
                  documentId, title, description, filename, fileSize, mimeType,
                  category, accessLevel, s3Key, uploadedBy, uploadedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
              `;

              await db.execute(insertQuery, [
                documentId,
                title,
                description,
                file.originalname,
                file.size,
                file.mimetype,
                category,
                accessLevel,
                file.key,
                uploadedBy
              ]);

              resolve({
                statusCode: 201,
                headers,
                body: JSON.stringify({
                  message: 'Document uploaded successfully',
                  documentId
                })
              });

            } catch (error) {
              console.error('Upload error:', error);
              resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'Failed to upload document' })
              });
            }
          });
        });

      case 'PUT':
        // Update document metadata
        const { title, description, category, accessLevel } = body;
        const documentId = pathParameters.id;

        if (!documentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Document ID is required' })
          };
        }

        const updateQuery = `
          UPDATE documents 
          SET title = ?, description = ?, category = ?, accessLevel = ?, updatedAt = NOW()
          WHERE documentId = ?
        `;

        const [updateResult] = await db.execute(updateQuery, [
          title, description, category, accessLevel, documentId
        ]);

        if (updateResult.affectedRows === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Document not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Document updated successfully' })
        };

      case 'DELETE':
        // Delete document
        const deleteDocumentId = pathParameters.id;

        if (!deleteDocumentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Document ID is required' })
          };
        }

        // Get document details to delete from S3
        const [docRows] = await db.execute(
          'SELECT s3Key FROM documents WHERE documentId = ?',
          [deleteDocumentId]
        );

        if (docRows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Document not found' })
          };
        }

        const s3Key = docRows[0].s3Key;

        // Delete from S3
        try {
          await s3.deleteObject({
            Bucket: BUCKET_NAME,
            Key: s3Key
          }).promise();
        } catch (s3Error) {
          console.error('S3 deletion error:', s3Error);
          // Continue with database deletion even if S3 fails
        }

        // Delete from database
        await db.execute(
          'DELETE FROM documents WHERE documentId = ?',
          [deleteDocumentId]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Document deleted successfully' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Documents Lambda Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};
