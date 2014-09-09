using System.Threading;
using System.Globalization;
using Microsoft.Win32;

namespace ExcelAddIn
{
    partial class Ribbon : Microsoft.Office.Tools.Ribbon.RibbonBase
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        public Ribbon()
            : base(Globals.Factory.GetRibbonFactory())
        {
            setLanguage();
            InitializeComponent();
        }

        // Equal function for Excel / Word / Powerpoint
        private void setLanguage()
        {
            int languageCode = 0;
            const string keyEntry = "UILanguage";
            // 15.0 Office 2013
            // 14.0 2010
            // 12.0 2003
            string[] versions = { "15.0", "14.0", "12.0" };
            foreach (string version in versions)
            {
                string reg = @"Software\Microsoft\Office\" + version + "\\Common\\LanguageResources";
                try
                {
                    RegistryKey k = Registry.CurrentUser.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageCode = (int)k.GetValue(keyEntry);

                }
                catch { }

                try
                {
                    RegistryKey k = Registry.LocalMachine.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageCode = (int)k.GetValue(keyEntry);
                }
                catch { }

                if (languageCode > 0)
                {
                    break;
                }
            }

            if (languageCode > 0)
            {
                Thread.CurrentThread.CurrentUICulture = new CultureInfo(languageCode);
            }
            else
            {
                Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
            }

            return;
        }

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }
       
        #region Component Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Ribbon));
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl1 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl2 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl3 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl4 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl5 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl6 = this.Factory.CreateRibbonDropDownItem();
            this.syracuseTab = this.Factory.CreateRibbonTab();
            this.dataGroup = this.Factory.CreateRibbonGroup();
            this.buttonConnect = this.Factory.CreateRibbonButton();
            this.buttonServer = this.Factory.CreateRibbonButton();
            this.settingsGroup = this.Factory.CreateRibbonGroup();
            this.buttonSettings = this.Factory.CreateRibbonButton();
            this.saveDocumentGroup = this.Factory.CreateRibbonGroup();
            this.buttonSave = this.Factory.CreateRibbonButton();
            this.buttonSaveAs = this.Factory.CreateRibbonButton();
            this.reportingGroup = this.Factory.CreateRibbonGroup();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.calculateSumButton = this.Factory.CreateRibbonToggleButton();
            this.localeGroup = this.Factory.CreateRibbonGroup();
            this.dropDownLocale = this.Factory.CreateRibbonDropDown();
            this.groupSageX3 = this.Factory.CreateRibbonGroup();
            this.actionPanelCheckBox = this.Factory.CreateRibbonCheckBox();
            this.dropDownInsert = this.Factory.CreateRibbonDropDown();
            this.dropDownDelete = this.Factory.CreateRibbonDropDown();
            this.groupVersion = this.Factory.CreateRibbonGroup();
            this.installedVersion = this.Factory.CreateRibbonLabel();
            this.buttonUpdate = this.Factory.CreateRibbonButton();
            this.version = this.Factory.CreateRibbonLabel();
            this.cleanupTemplateGroup = this.Factory.CreateRibbonGroup();
            this.buttonCleanup = this.Factory.CreateRibbonButton();
            this.syracuseTab.SuspendLayout();
            this.dataGroup.SuspendLayout();
            this.settingsGroup.SuspendLayout();
            this.saveDocumentGroup.SuspendLayout();
            this.reportingGroup.SuspendLayout();
            this.localeGroup.SuspendLayout();
            this.groupSageX3.SuspendLayout();
            this.groupVersion.SuspendLayout();
            this.cleanupTemplateGroup.SuspendLayout();
            // 
            // syracuseTab
            // 
            this.syracuseTab.Groups.Add(this.dataGroup);
            this.syracuseTab.Groups.Add(this.settingsGroup);
            this.syracuseTab.Groups.Add(this.saveDocumentGroup);
            this.syracuseTab.Groups.Add(this.reportingGroup);
            this.syracuseTab.Groups.Add(this.localeGroup);
            this.syracuseTab.Groups.Add(this.groupSageX3);
            this.syracuseTab.Groups.Add(this.groupVersion);
            this.syracuseTab.Groups.Add(this.cleanupTemplateGroup);
            resources.ApplyResources(this.syracuseTab, "syracuseTab");
            this.syracuseTab.Name = "syracuseTab";
            // 
            // dataGroup
            // 
            this.dataGroup.Items.Add(this.buttonConnect);
            this.dataGroup.Items.Add(this.buttonServer);
            resources.ApplyResources(this.dataGroup, "dataGroup");
            this.dataGroup.Name = "dataGroup";
            // 
            // buttonConnect
            // 
            this.buttonConnect.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonConnect, "buttonConnect");
            this.buttonConnect.Image = global::ExcelAddIn.Properties.Resources.connect;
            this.buttonConnect.Name = "buttonConnect";
            this.buttonConnect.ShowImage = true;
            this.buttonConnect.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonConnect_Click);
            // 
            // buttonServer
            // 
            this.buttonServer.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonServer.Image = global::ExcelAddIn.Properties.Resources.server_settings;
            resources.ApplyResources(this.buttonServer, "buttonServer");
            this.buttonServer.Name = "buttonServer";
            this.buttonServer.ShowImage = true;
            this.buttonServer.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonServer_Click);
            // 
            // settingsGroup
            // 
            this.settingsGroup.Items.Add(this.buttonSettings);
            resources.ApplyResources(this.settingsGroup, "settingsGroup");
            this.settingsGroup.Name = "settingsGroup";
            // 
            // buttonSettings
            // 
            this.buttonSettings.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSettings.Image = global::ExcelAddIn.Properties.Resources.settings;
            resources.ApplyResources(this.buttonSettings, "buttonSettings");
            this.buttonSettings.Name = "buttonSettings";
            this.buttonSettings.ShowImage = true;
            this.buttonSettings.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSettings_Click);
            // 
            // saveDocumentGroup
            // 
            this.saveDocumentGroup.Items.Add(this.buttonSave);
            this.saveDocumentGroup.Items.Add(this.buttonSaveAs);
            resources.ApplyResources(this.saveDocumentGroup, "saveDocumentGroup");
            this.saveDocumentGroup.Name = "saveDocumentGroup";
            // 
            // buttonSave
            // 
            this.buttonSave.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSave.Image = global::ExcelAddIn.Properties.Resources.sauvegarder;
            resources.ApplyResources(this.buttonSave, "buttonSave");
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.ShowImage = true;
            this.buttonSave.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSave_Click);
            // 
            // buttonSaveAs
            // 
            this.buttonSaveAs.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSaveAs.Image = global::ExcelAddIn.Properties.Resources.sauvegarder2;
            resources.ApplyResources(this.buttonSaveAs, "buttonSaveAs");
            this.buttonSaveAs.Name = "buttonSaveAs";
            this.buttonSaveAs.ShowImage = true;
            this.buttonSaveAs.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSaveAs_Click);
            // 
            // reportingGroup
            // 
            this.reportingGroup.Items.Add(this.buttonRefreshReport);
            this.reportingGroup.Items.Add(this.buttonPreview);
            this.reportingGroup.Items.Add(this.checkBoxShowTemplatePane);
            this.reportingGroup.Items.Add(this.calculateSumButton);
            resources.ApplyResources(this.reportingGroup, "reportingGroup");
            this.reportingGroup.Name = "reportingGroup";
            // 
            // buttonRefreshReport
            // 
            this.buttonRefreshReport.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonRefreshReport, "buttonRefreshReport");
            this.buttonRefreshReport.Image = global::ExcelAddIn.Properties.Resources.refresh;
            this.buttonRefreshReport.Name = "buttonRefreshReport";
            this.buttonRefreshReport.ShowImage = true;
            this.buttonRefreshReport.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefreshReport_Click);
            // 
            // buttonPreview
            // 
            this.buttonPreview.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonPreview.Image = global::ExcelAddIn.Properties.Resources.preview;
            resources.ApplyResources(this.buttonPreview, "buttonPreview");
            this.buttonPreview.Name = "buttonPreview";
            this.buttonPreview.ShowImage = true;
            this.buttonPreview.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPreview_Click);
            // 
            // checkBoxShowTemplatePane
            // 
            resources.ApplyResources(this.checkBoxShowTemplatePane, "checkBoxShowTemplatePane");
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
            this.checkBoxShowTemplatePane.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.checkBoxShowTemplatePane_Click);
            // 
            // calculateSumButton
            // 
            resources.ApplyResources(this.calculateSumButton, "calculateSumButton");
            this.calculateSumButton.Name = "calculateSumButton";
            // 
            // localeGroup
            // 
            this.localeGroup.Items.Add(this.dropDownLocale);
            resources.ApplyResources(this.localeGroup, "localeGroup");
            this.localeGroup.Name = "localeGroup";
            // 
            // dropDownLocale
            // 
            resources.ApplyResources(this.dropDownLocale, "dropDownLocale");
            this.dropDownLocale.Name = "dropDownLocale";
            this.dropDownLocale.SelectionChanged += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.dropDownLocale_SelectionChanged);
            // 
            // groupSageX3
            // 
            this.groupSageX3.Items.Add(this.actionPanelCheckBox);
            this.groupSageX3.Items.Add(this.dropDownInsert);
            this.groupSageX3.Items.Add(this.dropDownDelete);
            resources.ApplyResources(this.groupSageX3, "groupSageX3");
            this.groupSageX3.Name = "groupSageX3";
            // 
            // actionPanelCheckBox
            // 
            resources.ApplyResources(this.actionPanelCheckBox, "actionPanelCheckBox");
            this.actionPanelCheckBox.Name = "actionPanelCheckBox";
            this.actionPanelCheckBox.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.actionPanelCheckBox_Click);
            // 
            // dropDownInsert
            // 
            resources.ApplyResources(ribbonDropDownItemImpl1, "ribbonDropDownItemImpl1");
            resources.ApplyResources(ribbonDropDownItemImpl2, "ribbonDropDownItemImpl2");
            resources.ApplyResources(ribbonDropDownItemImpl3, "ribbonDropDownItemImpl3");
            this.dropDownInsert.Items.Add(ribbonDropDownItemImpl1);
            this.dropDownInsert.Items.Add(ribbonDropDownItemImpl2);
            this.dropDownInsert.Items.Add(ribbonDropDownItemImpl3);
            resources.ApplyResources(this.dropDownInsert, "dropDownInsert");
            this.dropDownInsert.Name = "dropDownInsert";
            // 
            // dropDownDelete
            // 
            resources.ApplyResources(ribbonDropDownItemImpl4, "ribbonDropDownItemImpl4");
            resources.ApplyResources(ribbonDropDownItemImpl5, "ribbonDropDownItemImpl5");
            resources.ApplyResources(ribbonDropDownItemImpl6, "ribbonDropDownItemImpl6");
            this.dropDownDelete.Items.Add(ribbonDropDownItemImpl4);
            this.dropDownDelete.Items.Add(ribbonDropDownItemImpl5);
            this.dropDownDelete.Items.Add(ribbonDropDownItemImpl6);
            resources.ApplyResources(this.dropDownDelete, "dropDownDelete");
            this.dropDownDelete.Name = "dropDownDelete";
            // 
            // groupVersion
            // 
            this.groupVersion.Items.Add(this.installedVersion);
            this.groupVersion.Items.Add(this.buttonUpdate);
            this.groupVersion.Items.Add(this.version);
            resources.ApplyResources(this.groupVersion, "groupVersion");
            this.groupVersion.Name = "groupVersion";
            // 
            // installedVersion
            // 
            resources.ApplyResources(this.installedVersion, "installedVersion");
            this.installedVersion.Name = "installedVersion";
            // 
            // buttonUpdate
            // 
            resources.ApplyResources(this.buttonUpdate, "buttonUpdate");
            this.buttonUpdate.Image = global::ExcelAddIn.Properties.Resources.refresh;
            this.buttonUpdate.Name = "buttonUpdate";
            this.buttonUpdate.ShowImage = true;
            this.buttonUpdate.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonUpdate_Click);
            // 
            // version
            // 
            resources.ApplyResources(this.version, "version");
            this.version.Name = "version";
            // 
            // cleanupTemplateGroup
            // 
            this.cleanupTemplateGroup.Items.Add(this.buttonCleanup);
            resources.ApplyResources(this.cleanupTemplateGroup, "cleanupTemplateGroup");
            this.cleanupTemplateGroup.Name = "cleanupTemplateGroup";
            // 
            // buttonCleanup
            // 
            resources.ApplyResources(this.buttonCleanup, "buttonCleanup");
            this.buttonCleanup.Name = "buttonCleanup";
            this.buttonCleanup.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonCleanup_Click);
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.Excel.Workbook";
            this.Tabs.Add(this.syracuseTab);
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
            this.syracuseTab.ResumeLayout(false);
            this.syracuseTab.PerformLayout();
            this.dataGroup.ResumeLayout(false);
            this.dataGroup.PerformLayout();
            this.settingsGroup.ResumeLayout(false);
            this.settingsGroup.PerformLayout();
            this.saveDocumentGroup.ResumeLayout(false);
            this.saveDocumentGroup.PerformLayout();
            this.reportingGroup.ResumeLayout(false);
            this.reportingGroup.PerformLayout();
            this.localeGroup.ResumeLayout(false);
            this.localeGroup.PerformLayout();
            this.groupSageX3.ResumeLayout(false);
            this.groupSageX3.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();
            this.cleanupTemplateGroup.ResumeLayout(false);
            this.cleanupTemplateGroup.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSageX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup settingsGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonConnect;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup dataGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonServer;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownDelete;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox actionPanelCheckBox;
        public Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownInsert;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
        private Microsoft.Office.Tools.Ribbon.RibbonTab syracuseTab;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup saveDocumentGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSaveAs;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup reportingGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonToggleButton calculateSumButton;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup localeGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownLocale;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup cleanupTemplateGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonCleanup;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
