using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;

namespace WordAddIn
{
    public class CommonUtils
    {
        public BrowserDialog browserDialog = null;

        public CommonUtils(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public void SaveDocumentToX3(Document doc)
        {
            //browserDialog.SaveDocumentToX3(doc);
        }
        public void SaveTemplateToX3(Document doc)
        {
            //browserDialog.SaveTemplateToX3(doc);
        }
    }
}
