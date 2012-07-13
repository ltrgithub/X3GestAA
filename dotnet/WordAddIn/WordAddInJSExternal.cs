using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;

// Do not rename, namespace and classname are refered in JS as WordAddIn.WordAddInJSExternal
namespace WordAddIn
{
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class WordAddInJSExternal
    {
        private SyracuseOfficeCustomData customData;
        private DatasourceForm dialogForm;

        public WordAddInJSExternal(SyracuseOfficeCustomData customData, DatasourceForm dialogForm)
        {
            this.customData = customData;
            this.dialogForm = dialogForm;
        }

        public SyracuseOfficeCustomData getSyracuseOfficeCustomData() 
        {
            return customData;
        }

        public void closeDialogForm() 
        {
            dialogForm.Close();
        }
   }
}
