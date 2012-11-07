using System;
using System.Collections.Generic;
using System.Text;
using Excel = Microsoft.Office.Interop.Excel;
using Microsoft.Office.Tools.Excel;
using Microsoft.Office.Tools.Excel.Extensions;
using System.Windows.Forms;
using System.Globalization;
using System.Threading;

namespace ExcelAddIn
{
    public enum CellsInsertStyle { ShiftCells = 0, InsertRows = 1, DoNothing = 2 }
    public enum CellsDeleteStyle { ShiftCells = 0, DeleteRows = 1, DoNothing = 2 }
    public partial class ThisAddIn
    {
        public String x3CustomPropDsPrefix = "Sage.X3.DS";
        public String connectUrlPropName = "Sage.X3.ConnectUrl";
        DatasourceMngtForm settingsForm = null;
        TableUpdateProgress progressForm = null;
        NativeWindow mainHandle = null;
        public bool Aborted = false;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            //
            Thread.CurrentThread.CurrentCulture = CultureInfo.InstalledUICulture;
            Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
            //
            if (this.Application.ActiveWorkbook != null)
                AutoConnect();
            this.Application.WorkbookOpen += new Excel.AppEvents_WorkbookOpenEventHandler(Application_WorkbookOpen);
            this.Application.WorkbookActivate += new Excel.AppEvents_WorkbookActivateEventHandler(Application_WorkbookActivate);
            this.Application.WorkbookBeforeSave += new Excel.AppEvents_WorkbookBeforeSaveEventHandler(Application_WorkbookBeforeSave);
            this.Application.SheetChange += new Excel.AppEvents_SheetChangeEventHandler(Application_SheetChange);
            this.Application.SheetSelectionChange += new Excel.AppEvents_SheetSelectionChangeEventHandler(Application_SheetSelectionChange);
        }

        public String SetupServerUrl()
        {
            ServerSettings settings = new ServerSettings();
            if (settings.ShowDialog() == DialogResult.OK)
            {
                String connectUrl = settings.GetConnectUrl();
                (new SyracuseCustomData()).StoreCustomDataByName("serverUrlAddress", connectUrl);
                return connectUrl;
            }
            return "";
        }
        public void AutoConnect()
        {
            var connectUrl = (new SyracuseCustomData()).GetCustomDataByName("serverUrlAddress");
            if (connectUrl != "")
                Connect();
        }
        public void Connect()
        {
            ActionPanel.Connect("");
        }

        public void RefreshAll()
        {
            ActionPanel.RefreshAll();
        }

        public String GetServerUrl()
        {
            var connectUrl = (new SyracuseCustomData()).GetCustomDataByName("serverUrlAddress");
            if (connectUrl == "")
                connectUrl = Globals.ThisAddIn.SetupServerUrl();
            return connectUrl;
        }
        public CellsInsertStyle GetCellsInsertStyle()
        {
            return (CellsInsertStyle)Ribbon.dropDownInsert.SelectedItemIndex;
        }
        public CellsDeleteStyle GetCellsDeleteStyle()
        {
            return (CellsDeleteStyle)Ribbon.dropDownDelete.SelectedItemIndex;
        }

        public void ShowSettingsForm()
        {
            //
            var connectUrl = GetServerUrl();
            if (connectUrl == "") return;
            if (settingsForm == null)
            {
                settingsForm = new DatasourceMngtForm();
                settingsForm.Connect(connectUrl);
            }
            mainHandle = NativeWindow.FromHandle(ActionPanel.Handle);
            if(!settingsForm.Visible)
                settingsForm.Show(mainHandle);
        }
        internal void SettingsFormDestroyed()
        {
            settingsForm = null;
        }
        internal void ShowProgressForm(bool doShow)
        {
            if (doShow)
            {
                progressForm = new TableUpdateProgress();
                if (settingsForm != null)
                    progressForm.Show(settingsForm);
                else
                    progressForm.Show(mainHandle);
            }
            else
            {
                if (progressForm != null)
                {
                    progressForm.Close();
                    progressForm = null;
                }
            }
        }
        internal void UpdateProgress(int linesCount)
        {
            if (progressForm != null)
                progressForm.UpdateProgress(linesCount);
        }

        public Ribbon Ribbon
        {
            get { return (Ribbon)Globals.Ribbons.Ribbon; }
        }
        public ActionPanel ActionPanel
        {
            get { return (ActionPanel)this.CustomTaskPanes[0].Control; }
        }

        // EVENTS
        void Application_WorkbookOpen(Excel.Workbook Wb)
        {
            AutoConnect();
        }
        void Application_WorkbookActivate(Excel.Workbook Wb)
        {
            if ((settingsForm != null) && settingsForm.Visible)
                settingsForm.RefreshBrowser();
        }
        void Application_WorkbookBeforeSave(Excel.Workbook wb, bool SaveAsUI, ref bool Cancel)
        {
            if (!SaveAsUI)
            {
                if (((new SyracuseCustomData()).GetCustomDataByName("documentUrlAddress") != "") &&
                    (MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.MSG_SAVE_AS),
                    global::ExcelAddIn.Properties.Resources.MSG_SAVE_AS_TITLE, MessageBoxButtons.YesNo) == DialogResult.Yes))
                {
                    SaveDocumentToSyracuse();
                    Cancel = true;
                }
            }
        }
        void Application_SheetChange(object sh, Excel.Range target)
        {
            Ribbon.buttonPublish.Enabled = true;
        }

        void Application_SheetSelectionChange(object sh, Excel.Range target)
        {
            ActionPanel.onSelectionChange();
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
            if (mainHandle != null)
            {
                mainHandle.ReleaseHandle();
                mainHandle = null;
            }
        }

        internal void SaveDocumentToSyracuse()
        {
            if ((new SyracuseCustomData()).GetCustomDataByName("documentUrlAddress") != "")
                //  save by action panel
                ActionPanel.SaveDocument();
            else
            {
                ActionPanel.Connect("");
                ShowSettingsForm();
            }
        }

        #region VSTO generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }
        
        #endregion

    }
}
