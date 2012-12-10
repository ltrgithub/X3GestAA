using System;
using System.IO;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Office.Core;
using Microsoft.Office.Interop.PowerPoint;
using Microsoft.Office.Interop.Excel;

namespace PowerPointAddIn
{
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class PptAddInJSExternal
    {
        private PptCustomData customData;
        private PptCustomXlsData customXlsData;
        private BrowserDialog browserDialog;

        public PptAddInJSExternal(PptCustomData customData, BrowserDialog browserDialog)
        {
            this.customData = customData;
            this.browserDialog = browserDialog;
        }

        public PptAddInJSExternal(PptCustomData customData, PptCustomXlsData customXlsData, BrowserDialog browserDialog)
        {
            this.customData = customData;
            this.customXlsData = customXlsData;
            this.browserDialog = browserDialog;
        }

        public PptCustomData getPptCustomData()
        {
            return customData;
        }

        public PptCustomXlsData getPptCustomXlsData() 
        {
            return customXlsData;
        }
        public void setPptCustomXlsData(PptCustomXlsData xcd)
        {
            this.customXlsData = xcd;
        }
        public void addDataToWorksheet(String data)
        {
            Globals.PowerPointAddIn.pptActions.addDataToWorksheet(getPptCustomData().getPresentation(), getPptCustomXlsData(), data);
        }
        public void refreshNextChart()
        {
            Globals.PowerPointAddIn.pptActions.refreshNextChart(getPptCustomData().getPresentation());
        }
        public void NotifySaveDocumentDone()
        {
            browserDialog.Hide();
            CommonUtils.ShowInfoMessage(global::PowerPointAddIn.Properties.Resources.MSG_SAVE_DOC_DONE, global::PowerPointAddIn.Properties.Resources.MSG_SAVE_DOC_DONE_TITLE);
        }

        public string GetDocumentContent()
        {
            Presentation pres = (customData != null) ? customData.getPresentation() : null; // this.doc;
            if (pres == null)
            {
                CommonUtils.ShowErrorMessage(global::PowerPointAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return "";
            }

            String tempFileName = Path.GetTempFileName();
            pres.SaveCopyAs(tempFileName);
            byte[] content = System.IO.File.ReadAllBytes(tempFileName);
            String base64string = Convert.ToBase64String(content);
            return base64string;
        }
          
        public BrowserDialog getBrowserDialog()
        {
            return browserDialog;
        }
        
        // check version 
        public String getAddinVersion()
        {
            return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString();
        }
    }
}
