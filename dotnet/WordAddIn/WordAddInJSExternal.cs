using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;

namespace WordAddIn
{
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    class WordAddInJSExternal
    {
        private Document document;

        public WordAddInJSExternal(Document doc)
        {
            this.document = doc;
        }
    }
}
