using System;
using System.Collections.Generic;
using System.Text;
using Excel = Microsoft.Office.Interop.Excel;
using Microsoft.Office.Tools.Excel;
using Microsoft.Office.Tools.Excel.Extensions;
using System.Windows.Forms;
using System.Globalization;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Office.Core;
using System.IO;
using Microsoft.Win32;


namespace ExcelAddIn
{
    public enum CellsInsertStyle { ShiftCells = 0, InsertRows = 1, DoNothing = 2 }
    public enum CellsDeleteStyle { ShiftCells = 0, DeleteRows = 1, DoNothing = 2 }

    // Functions exposed to other Applications using COM
    // These functions are called by the powerpoint addin at the moment.
    // It would be possible to have the code in the ppt-addin, but having it here
    // is is better since it's not out of sight when modifying the excel addin
    public class ExposedAddInUtilities
    {

        public void connectWorkbook(Excel.Workbook wb, String serverUrl, String datasourcesJSON)
        {
            Excel.Workbook oldWb = Globals.ThisAddIn.Application.ActiveWorkbook;
            Excel.Worksheet oldWs = Globals.ThisAddIn.Application.ActiveWorkbook.ActiveSheet;
            
            ((Microsoft.Office.Interop.Excel._Workbook) wb).Activate();
            Excel.Worksheet ws = wb.ActiveSheet;
            (new SyracuseCustomData()).StoreCustomDataByName("serverUrlAddress", serverUrl);
            (new SyracuseCustomData()).StoreCustomDataByName("datasourcesAddress", datasourcesJSON);

            ((Microsoft.Office.Interop.Excel._Worksheet) ws).Activate();
            Globals.ThisAddIn.AutoConnect();
        }
        public bool isWorkbookConnected(Workbook wb)
        {
            return ((new SyracuseCustomData()).GetReservedSheet(false) != null);
        }
        public void refreshWorkbook(Workbook wb)
        {
            Excel.Workbook oldWb = Globals.ThisAddIn.Application.ActiveWorkbook;
            wb.Activate();
            Globals.ThisAddIn.RefreshAll();
            if (oldWb != wb)
            {
                ((Microsoft.Office.Interop.Excel._Workbook)oldWb).Activate();
            }
        }
    };

    public partial class ThisAddIn
    {
        public String x3CustomPropDsPrefix = "Sage.X3.DS";
        public String connectUrlPropName = "Sage.X3.ConnectUrl";
        DatasourceMngtForm settingsForm = null;
        TableUpdateProgress progressForm = null;
        NativeWindow mainHandle = null;
        public bool Aborted = false;
        private ExposedAddInUtilities utilities;
        public bool prefShowPanel = true;
        public String prefUrl = null;
        public Boolean newVersionMessage = false;
        public int versionNumberBinary = 0;


        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            //
            Thread.CurrentThread.CurrentCulture = CultureInfo.InstalledUICulture;
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
            // Is the document an excel document with embedded data?
            if (handleCvgDocument(Wb))
                return;
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

        protected override object RequestComAddInAutomationService()
        {
            if (utilities == null)
                utilities = new ExposedAddInUtilities();

            return utilities;
        }

        internal void SavePreferences()
        {
            String path = GetPreferenceFilePath();
            String[] props = new String[2];
            props[0] = "Show=" + prefShowPanel;
            props[1] = "Url=" + prefUrl;  
            System.IO.StreamWriter file = new System.IO.StreamWriter(path);
            try
            {
                foreach (String s in props)
                {
                    file.WriteLine(s);
                }
            }
            catch (Exception e) { MessageBox.Show(e.Message); }
            file.Close();
        }

        public void ReadPreferences()
        {
            String path = GetPreferenceFilePath();
            string sContent = "";

            if (File.Exists(path))
            {
                StreamReader myFile = new StreamReader(path, System.Text.Encoding.Default);
                while (!myFile.EndOfStream)
                {
                    sContent = myFile.ReadLine();
                    if (sContent.Equals("Show=False"))
                    {
                        prefShowPanel = false;
                    }
                    else if (sContent.Substring(0, 4).Equals("Url="))
                    {
                        prefUrl = sContent.Substring(4, sContent.Length - 4);
                    }
                }
                myFile.Close();
            }
            return;
        }

        internal string GetPreferenceFilePath()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\Excel.X3.settings";
        }
        public bool GetPrefShowPanel()
        {
            return prefShowPanel;
        }
        public void SetPrefShowPanel(Boolean show)
        {
            prefShowPanel = show;
            SavePreferences();
        }
        public void SetPrefUrl(String url)
        {
            prefUrl = url;
            SavePreferences();
        }
        public String GetPrefUrl()
        {
            return prefUrl;
        }

        public void removeFiles()
        {
            String file = GetPreferenceFilePath();
            File.Delete(file);
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


        internal void BrowseDocuments(string volumeCode)
        {
            var connectUrl = GetServerUrl();
            if (connectUrl == "") return;
            DocumentBrowser b = new DocumentBrowser();
            b.SelectDocument(connectUrl, volumeCode);
            b.ShowDialog();
        }

        internal void SISettings()
        {
            var connectUrl = GetServerUrl();
            if (connectUrl == "") return;
            SISettings s = new SISettings();
            s.Connect(connectUrl);
            s.ShowDialog();
        }

        bool handleCvgDocument(Excel.Workbook wb)
        {
            CustomXMLNode foundNode = null;
            try
            {
                foreach (CustomXMLPart part in wb.CustomXMLParts)
                {
                    CustomXMLNode node = part.SelectSingleNode("SyracuseOfficeCustomData");
                    if (node != null)
                    {
                        foundNode = node;
                        break;
                    }
                }
                if (foundNode != null)
                {
                    JavaScriptSerializer ser = new JavaScriptSerializer();
                    Dictionary<String, object> dict = (Dictionary<String, object>)ser.DeserializeObject(foundNode.Text);

                    string proto = null;
                    string data = null;
                    string styles = null;

                    try { proto = dict["proto"].ToString(); }
                    catch (Exception) { }
                    try { data = dict["data"].ToString(); }
                    catch (Exception) { }
                    try { styles = dict["styles"].ToString(); }
                    catch (Exception) { }

                    External ext = new External();
                    
                    if ((proto != null) && (data != null))
                    {
                        ext.ResizeTable("cvg", proto, 1, "");
                        ext.StartUpdateTable();
                        ext.UpdateTable("cvg", proto, data, 0);
                        ext.EndUpdateTable();
                    }
                    else
                    {
                        return true;
                    }

                    wb.ActiveSheet.Cells.Clear();


                    // Remove all custom data since this is a standalone document!
                    foundNode.Text = "";
                    SyracuseCustomData cd = new SyracuseCustomData();
                    Excel.Worksheet ws = cd.GetReservedSheet(false);
                    if (ws != null)
                    {
                        ws.Rows.Clear();
                    }
                    return true;
                }
            }
            catch (Exception e) { MessageBox.Show(e.Message); }
            return false;
        }

        public string getInstalledAddinVersion()
        {
            String addinVersion = "0.0.0";
            RegistryKey regLM = Registry.LocalMachine;
            RegistryKey installerProductKey = regLM.OpenSubKey("SOFTWARE\\Classes\\Installer\\Products");
            foreach (string subKeyName in installerProductKey.GetSubKeyNames())
            {
                using (RegistryKey sk = installerProductKey.OpenSubKey(subKeyName))
                {
                    foreach (string valueName in sk.GetValueNames())
                    {
                        if (valueName == "ProductName")
                        {
                            if (sk.GetValue(valueName).ToString() == "Sage ERP X3 Office Addins")
                            {
                                Object decVersion = sk.GetValue("Version");
                                int v = Convert.ToInt32(decVersion.ToString());
                                versionNumberBinary = v;
                                String vr = ((v & 0xFF000000) >> 24) + "." + ((v & 0x00FF0000) >> 16) + "." + (v & 0x0000FFFF);
                                addinVersion = vr;
                                break;
                            }
                        }
                    }
                    sk.Close();
                }
            }

            installerProductKey.Close();
            regLM.Close();
            return addinVersion;
        }
    }
}
