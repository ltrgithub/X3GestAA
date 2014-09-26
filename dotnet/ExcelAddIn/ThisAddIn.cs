using System;
using System.Collections.Generic;
using Excel = Microsoft.Office.Interop.Excel;
using System.Windows.Forms;
using System.Globalization;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Office.Core;
using System.IO;
using Microsoft.Win32;
using Microsoft.Office.Interop.Excel;
using CommonDataHelper;


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
            (new SyracuseCustomData(wb)).StoreCustomDataByName("serverUrlAddress", serverUrl);
            (new SyracuseCustomData(wb)).StoreCustomDataByName("datasourcesAddress", datasourcesJSON);

            ((Microsoft.Office.Interop.Excel._Worksheet) ws).Activate();
            Globals.ThisAddIn.AutoConnect(wb);
        }

        public bool isWorkbookConnected(Excel.Workbook wb)
        {
            return ((new SyracuseCustomData((Excel.Workbook)wb)).GetReservedSheet(false) != null);
        }

        public void refreshWorkbook(Excel.Workbook workbook)
        {
            Excel.Workbook oldWorkbook = Globals.ThisAddIn.Application.ActiveWorkbook;
            
            workbook.Activate();
            
            Globals.ThisAddIn.RefreshAll();
            if (oldWorkbook != workbook)
            {
                ((Microsoft.Office.Interop.Excel._Workbook)oldWorkbook).Activate();
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
        public bool prefShowPanel = false;
        public String prefUrl = null;
        public Boolean newVersionMessage = false;
        public int versionNumberBinary = 0;

        public CommonUtils commons = null;
        private BrowserDialog browserDialog = null;
        public TemplateActions templateActions = null;
        //
        ActionPanel actionPanel = new ActionPanel();
        Microsoft.Office.Tools.CustomTaskPane taskPane;
        private Boolean handleWorkbookOpen = false;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            browserDialog = new BrowserDialog();
            templateActions = new TemplateActions(browserDialog);
            commons = new CommonUtils(browserDialog);

            Thread.CurrentThread.CurrentCulture = CultureInfo.InstalledUICulture;
            //System.Diagnostics.Debugger.Launch();
            /*
            taskPane = this.CustomTaskPanes.Add(actionPanel, "Sage ERP X3");
            taskPane.VisibleChanged += new EventHandler(ActionPanel_VisibleChanged);
            this.ReadPreferences();
            taskPane.Visible = this.GetPrefShowPanel();
             */
            templateActions.DisableTemplateButtons();

            if (this.Application.ActiveWorkbook != null)
                AutoConnect(this.Application.ActiveWorkbook);
            this.Application.WorkbookOpen += new Excel.AppEvents_WorkbookOpenEventHandler(Application_WorkbookOpen);
            this.Application.WorkbookActivate += new Excel.AppEvents_WorkbookActivateEventHandler(Application_WorkbookActivate);
            this.Application.WorkbookBeforeSave += new Excel.AppEvents_WorkbookBeforeSaveEventHandler(Application_WorkbookBeforeSave);
            this.Application.SheetChange += new Excel.AppEvents_SheetChangeEventHandler(Application_SheetChange);
            this.Application.SheetSelectionChange += new Excel.AppEvents_SheetSelectionChangeEventHandler(Application_SheetSelectionChange);
        }

        public String SetupServerUrl(Excel.Workbook Wb = null)
        {
            Excel.Workbook oldWb = null;
            if (Wb != null)
            {
                oldWb = this.Application.ActiveWorkbook;
                ((Microsoft.Office.Interop.Excel._Workbook)Wb).Activate(); 
            }

            String connectUrl = BaseUrlHelper.BaseUrl.ToString();
            if (connectUrl != "")
            {
                (new SyracuseCustomData(this.Application.ActiveWorkbook)).StoreCustomDataByName("serverUrlAddress", connectUrl);
            }
            return connectUrl;
        }
        
        public void AutoConnect(Excel.Workbook Wb = null)
        {
            var connectUrl = (new SyracuseCustomData(Wb)).GetCustomDataByName("serverUrlAddress");
            if (connectUrl != "")
            {
                BaseUrlHelper.BaseUrl = new Uri(connectUrl);
                Connect(Wb, connectUrl);
            }
        }

        public void Connect(Excel.Workbook Wb = null, string connectUrl = "")
        {
            ActionPanel.Connect(connectUrl, true, Wb);
        }

        public void RefreshAll()
        {
            ActionPanel.RefreshAll();
        }

        public String GetServerUrl(Excel.Workbook Wb)
        {
            var connectUrl = (new SyracuseCustomData(Wb)).GetCustomDataByName("serverUrlAddress");
            if (connectUrl == "")
                connectUrl = Globals.ThisAddIn.SetupServerUrl(Wb);
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
            var connectUrl = GetServerUrl(this.Application.ActiveWorkbook);
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
            get {
                if (actionPanel.IsDisposed)
                {
                    /*
                     * IE9 + Excel 2013 in protected mode issue.
                     */
                    actionPanel = new ActionPanel();
                }
                return actionPanel;
            }
        }

        void Application_WorkbookOpen(Excel.Workbook workbook)
        {
            handleWorkbookOpen = true;
        }

        public void Application_WorkbookActivate(Excel.Workbook Wb)
        {
            if (handleWorkbookOpen)
            {
                /*
                 * Processing this functionality here, as opposed to in WorkbookOpen, 
                 * ensures that Globals.ThisAddIn.Application.ActiveWorkbook is not null.
                 */
                handleWorkbookOpen = false;

                if (templateActions.isExcelTemplateType(Wb))
                {
                    addReportingFieldsTaskPane(Application.ActiveWindow);
                    templateActions.ProcessExcelTemplate(Wb);
                }
                else
                {
                    // Is the document an excel document with embedded data?
                    if (handleCvgDocument(Wb) == false)
                        AutoConnect(Wb);
                }
            }

            checkButton(Wb);

            Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
            Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;

            if ((settingsForm != null) && settingsForm.Visible)
                settingsForm.RefreshBrowser();

            Excel.Workbook workbook = getActiveWorkbook();
            if (workbook == null)
            {
                return;
            }

            if (isSyracuseWorkbook(Wb))
                Ribbon.RibbonUI.ActivateTab("syracuseTab");

            SyracuseOfficeCustomData cd = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (cd != null)
            {
                templateActions.ConfigureTemplateRibbon(workbook, cd.getCreateMode(), "".Equals(cd.getDocumentUrl()) == false);
                commons.SetSupportedLocales(cd);
                commons.DisplayDocumentLocale(Wb);
            }
            else
            {
                if (templateActions.isExcelTemplateType(Wb) == false)
                {
                    commons.SetSupportedLocales(new SyracuseCustomData(workbook));
                    commons.DisplayDocumentLocale(Wb);
                    templateActions.DisableTemplateButtons();
                }
            }
            commons.DisplayServerLocations();
            workbook.Worksheets["Sage.X3.ReservedSheet"].Visible = Excel.XlSheetVisibility.xlSheetVisible;

        }

        void Application_WorkbookBeforeSave(Excel.Workbook wb, bool SaveAsUI, ref bool Cancel)
        {
            if (!SaveAsUI)
            {
                if (((new SyracuseCustomData(wb)).GetCustomDataByName("documentUrlAddress") != "") &&
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
            Excel.Workbook workbook = getActiveWorkbook();
            if (workbook == null)
            {
                return;
            }

            if (Globals.ThisAddIn.Application.ActiveWorkbook.Saved == false)
            {
                Console.WriteLine("test");
            }

            if (templateActions.isExcelTemplate(workbook))
            {
                SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
                if (customData != null)
                {
                    CheckForPlaceholderDeletion(workbook);

                    if ("".Equals(customData.getDocumentUrl()) == false)
                    {
                        Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
                    }
                }
            }
            else if (templateActions.isV6EmbeddedDocument(workbook))
            {
                SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
                if (customData != null)
                {
                    commons.ExtractV6Document(workbook, customData);
                }
            }
            else if ((new SyracuseCustomData(workbook)).GetCustomDataByName("documentUrlAddress") != "")
                Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
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

        /*
         * In the absence of a vsto delete cell event, a placeholder will be removed 
         * from the Name Manager if the placeholder's text is removed in it's entirety. 
         */
        private void CheckForPlaceholderDeletion(Excel.Workbook workbook)
        {
            foreach (Name name in workbook.Names)
            {
                Range range = null;
                try
                {
                     range = workbook.ActiveSheet.Range(name.RefersTo);
                }
                catch (Exception)
                {
                    /*
                     * We've got an invalid reference, so just delete the name
                     */
                    name.Delete();
                    continue;
                }

                if (workbook.ActiveSheet.Range(name.RefersTo).Value2 == null)
                    name.Delete();
            }
        }

        internal void SaveDocumentToSyracuse()
        {
            if ((new SyracuseCustomData(this.Application.ActiveWorkbook)).GetCustomDataByName("documentUrlAddress") != "")
            {
                //  save by action panel
                ActionPanel.SaveDocument();
            }
            else
            {
                ActionPanel.Connect("");
                ShowSettingsForm();
            }
        }

        internal void SaveAsDocumentToSyracuse()
        {
            SyracuseCustomData cd = new SyracuseCustomData(this.Application.ActiveWorkbook);
            if (cd != null && cd.GetCustomDataByName("documentUrlAddress") != "")
            {
                // clear the URL in order to be able to Save the document.
                cd.StoreCustomDataByName("documentUrlAddress", "");
                Globals.ThisAddIn.Application.ActiveWorkbook.Saved = false;
            }

            ActionPanel.Connect("");
            ShowSettingsForm();
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
                    if (sContent.Equals("Show=True"))
                    {
                        prefShowPanel = true;
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

        private void ReportingFieldsPane_VisibleChanged(object sender, EventArgs e)
        {
            if (Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled == false)
                return;

            Microsoft.Office.Tools.CustomTaskPane taskPane = sender as Microsoft.Office.Tools.CustomTaskPane;
            if (taskPane != null)
            {
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = taskPane.Visible;
            }
            else
            {
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = false;
            }
        }

        private Microsoft.Office.Tools.CustomTaskPane addReportingFieldsTaskPane(Window win)
        {
            try
            {
                foreach (Microsoft.Office.Tools.CustomTaskPane pane in CustomTaskPanes)
                {
                    if (pane.Control is ExcelTemplatePane)
                    {
                        if (pane.Control.IsDisposed == true)
                        {
                            /*
                             * IE9 + Excel 2013 in protected mode issue.
                             */
                            CustomTaskPanes.Remove(pane);
                            break;
                        }

                        return pane;
                    }
                }
            }
            catch (Exception) { }

            Microsoft.Office.Tools.CustomTaskPane p;
            p = CustomTaskPanes.Add(new ExcelTemplatePane(), "Template fields", win);
            p.VisibleChanged += ReportingFieldsPane_VisibleChanged;
            return p;
        }

        public void showReportingFieldsTaskPane(bool visible)
        {
            Microsoft.Office.Tools.CustomTaskPane pane = addReportingFieldsTaskPane(Application.ActiveWindow);
            pane.Visible = visible;
            if (visible)
            {
                ExcelTemplatePane t = (ExcelTemplatePane)pane.Control;
                Excel.Workbook workbook = getActiveWorkbook();
                t.showFields(workbook);
            }
        }

        public Excel.Workbook getActiveWorkbook()
        {
            if (this.Application == null)
                return null;

            if (this.Application.Workbooks.Count <= 0)
                return null;
            return Application.ActiveWorkbook;
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
            var connectUrl = GetServerUrl(this.Application.ActiveWorkbook);
            if (connectUrl == "") return;
            DocumentBrowser b = new DocumentBrowser();
            b.SelectDocument(connectUrl, volumeCode);
            b.ShowDialog();
        }

        internal void SISettings()
        {
            var connectUrl = GetServerUrl(this.Application.ActiveWorkbook);
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
                        wb.ActiveSheet.Cells.Clear();
                        ext.ResizeTable("cvg", proto, 1, "");
                        ext.StartUpdateTable();
                        ext.UpdateTable("cvg", proto, data, 0);
                        ext.EndUpdateTable();
                    }
                    else
                    {
                        return true;
                    }

                    // Remove all custom data since this is a standalone document!
                    foundNode.Text = "";
                    SyracuseCustomData cd = new SyracuseCustomData(wb);
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

        internal void ShowActionPanel(bool state)
        {
            if (taskPane.Control.IsDisposed && taskPane.Control is ActionPanel)
            {
                /*
                 * With IE9 + Excel 2013 in protected mode, the add-in is unloaded after selecting Enable Editing.
                 * To prevent exceptions being thrown, we'll create a new ActionPanel and add it to the CustomTaskPanes.
                 */
                CustomTaskPanes.Remove(taskPane);
                taskPane = this.CustomTaskPanes.Add(ActionPanel, "Sage ERP X3");
                taskPane.VisibleChanged += ActionPanel_VisibleChanged;
            }
            taskPane.Visible = state;
        }

        private void ActionPanel_VisibleChanged(object sender, EventArgs e)
        {
            Microsoft.Office.Tools.CustomTaskPane taskPane = sender as Microsoft.Office.Tools.CustomTaskPane;
            if (taskPane != null)
            {
                Globals.Ribbons.Ribbon.actionPanelCheckBox.Checked = taskPane.Visible;
            }
            else
            {
                Globals.Ribbons.Ribbon.actionPanelCheckBox.Checked = false;
            }
            this.SetPrefShowPanel(taskPane.Visible);
        }

        // Enable / disable refresh-Button
        void checkButton(Excel.Workbook Wb)
        {
            Excel.Worksheet ws = Wb.ActiveSheet;
            String hl = "";
            if (ws.Hyperlinks.Count > 0)
                hl = ws.Hyperlinks[1].Address;
            if (hl.Contains("SyracuseOfficeAddinsSetup.EXE"))
            {
                ws.Cells[1, 1] = "";
            }

            if ((new SyracuseCustomData(Wb)).GetCustomDataByName("datasourcesAddress") != "")
            {
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = true;
            }
            else
            {
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
            }
        }

        private Boolean isSyracuseWorkbook(Workbook Wb)
        {
            return new SyracuseCustomData(Wb).GetReservedSheet(false) != null;
        }
    }
}
