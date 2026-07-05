const { PDFParse } = require("pdf-parse");
const ApiError = require("../utils/apiError");

async function extractText(buffer) {
     let parser;
     try{
          parse = new PDFParse({ data: buffer });
          const result = await parse.getText();

          const text = (result.text || "").trim();
          if(!text || text.length < 50) {
               throw ApiError.badRequest(
                    "Could not extract readable text - id this a scanned/image-only PDF?"
               );
          }

          return {
               text,
               meta: {
                    numPages: result.pages?.length ?? result.numPages ?? null
               },
          };
     }catch (err) {
          if(err.isOperational) throw err;
          throw ApiError.badRequest("Failed to parse PDF: " + err.message);
     } finally {
          try{
               await parse?.destroy?.();
          }catch{
               // nothing there
          }
     }
}

module.exports = { extractText }