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
        private SyracuseOfficeCustomData customData;
        private PptCustomXlsData customXlsData;
        private BrowserDialog browserDialog;

        public PptAddInJSExternal(SyracuseOfficeCustomData customData, BrowserDialog browserDialog)
        {
            this.customData = customData;
            this.browserDialog = browserDialog;
        }

        public PptAddInJSExternal(SyracuseOfficeCustomData customData, PptCustomXlsData customXlsData, BrowserDialog browserDialog)
        {
            this.customData = customData;
            this.customXlsData = customXlsData;
            this.browserDialog = browserDialog;
        }

        public SyracuseOfficeCustomData getPptCustomData()
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

        public BrowserDialog getBrowserDialog()
        {
            return browserDialog;
        }
        
        // check version 
        public String getAddinVersion()
        {
            return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString();
        }

        public void expectedVersion(String neededVersion)
        {
            string[] needed = neededVersion.Split('.');
            int neddedBinary = (Convert.ToInt32(needed[0]) << 24);
            neddedBinary += (Convert.ToInt32(needed[1]) << 16);
            neddedBinary += Convert.ToInt32(needed[2]);

            if (neddedBinary > Globals.PowerPointAddIn.versionNumberBinary)
            {
                if (Globals.PowerPointAddIn.newVersionMessage == false)
                {
                    DialogResult result = MessageBox.Show(new Form() { TopMost = true }, global::PowerPointAddIn.Properties.Resources.MSG_NEW_VERSION, global::PowerPointAddIn.Properties.Resources.MSG_NEW_VERSION_TITLE, MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button1);
                    Globals.PowerPointAddIn.newVersionMessage = true;
                    if (result == DialogResult.Yes)
                    {
                        Globals.PowerPointAddIn.common.updateAddin();
                    }
                    else
                    {
                        Globals.Ribbons.Ribbon.buttonUpdate.Enabled = true;
                    }
                }
            }
        }
    }
}
