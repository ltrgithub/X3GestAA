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
            this.syracuseTab = this.Factory.CreateRibbonTab();
            this.group1 = this.Factory.CreateRibbonGroup();
            this.group2 = this.Factory.CreateRibbonGroup();
            this.group3 = this.Factory.CreateRibbonGroup();
            this.groupSageX3 = this.Factory.CreateRibbonGroup();
            this.checkBox1 = this.Factory.CreateRibbonCheckBox();
            this.dropDownInsert = this.Factory.CreateRibbonDropDown();
            this.dropDownDelete = this.Factory.CreateRibbonDropDown();
            this.groupVersion = this.Factory.CreateRibbonGroup();
            this.installedVersion = this.Factory.CreateRibbonLabel();
            this.version = this.Factory.CreateRibbonLabel();
            this.syracuseTemplateTab = this.Factory.CreateRibbonTab();
            this.groupSave = this.Factory.CreateRibbonGroup();
            this.groupReporting = this.Factory.CreateRibbonGroup();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.groupLocale = this.Factory.CreateRibbonGroup();
            this.dropDownLocale = this.Factory.CreateRibbonDropDown();
            this.group4 = this.Factory.CreateRibbonGroup();
            this.label1 = this.Factory.CreateRibbonLabel();
            this.label2 = this.Factory.CreateRibbonLabel();
            this.group5 = this.Factory.CreateRibbonGroup();
            this.buttonConnect = this.Factory.CreateRibbonButton();
            this.buttonServer = this.Factory.CreateRibbonButton();
            this.buttonSettings = this.Factory.CreateRibbonButton();
            this.buttonRefreshAll = this.Factory.CreateRibbonButton();
            this.buttonPublish = this.Factory.CreateRibbonButton();
            this.buttonUpdate = this.Factory.CreateRibbonButton();
            this.buttonSave = this.Factory.CreateRibbonButton();
            this.buttonSaveAs = this.Factory.CreateRibbonButton();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.toggleMakeSum = this.Factory.CreateRibbonToggleButton();
            this.button1 = this.Factory.CreateRibbonButton();
            this.buttonCleanup = this.Factory.CreateRibbonButton();
            this.syracuseTab.SuspendLayout();
            this.group1.SuspendLayout();
            this.group2.SuspendLayout();
            this.group3.SuspendLayout();
            this.groupSageX3.SuspendLayout();
            this.groupVersion.SuspendLayout();
            this.syracuseTemplateTab.SuspendLayout();
            this.groupSave.SuspendLayout();
            this.groupReporting.SuspendLayout();
            this.groupLocale.SuspendLayout();
            this.group4.SuspendLayout();
            this.group5.SuspendLayout();
            // 
            // syracuseTab
            // 
            this.syracuseTab.Groups.Add(this.group1);
            this.syracuseTab.Groups.Add(this.group2);
            this.syracuseTab.Groups.Add(this.group3);
            this.syracuseTab.Groups.Add(this.groupSageX3);
            this.syracuseTab.Groups.Add(this.groupVersion);
            resources.ApplyResources(this.syracuseTab, "syracuseTab");
            this.syracuseTab.Name = "syracuseTab";
            // 
            // group1
            // 
            this.group1.Items.Add(this.buttonConnect);
            this.group1.Items.Add(this.buttonServer);
            resources.ApplyResources(this.group1, "group1");
            this.group1.Name = "group1";
            // 
            // group2
            // 
            this.group2.Items.Add(this.buttonSettings);
            this.group2.Items.Add(this.buttonRefreshAll);
            resources.ApplyResources(this.group2, "group2");
            this.group2.Name = "group2";
            // 
            // group3
            // 
            this.group3.Items.Add(this.buttonPublish);
            resources.ApplyResources(this.group3, "group3");
            this.group3.Name = "group3";
            // 
            // groupSageX3
            // 
            this.groupSageX3.Items.Add(this.checkBox1);
            this.groupSageX3.Items.Add(this.dropDownInsert);
            this.groupSageX3.Items.Add(this.dropDownDelete);
            resources.ApplyResources(this.groupSageX3, "groupSageX3");
            this.groupSageX3.Name = "groupSageX3";
            // 
            // checkBox1
            // 
            resources.ApplyResources(this.checkBox1, "checkBox1");
            this.checkBox1.Name = "checkBox1";
            this.checkBox1.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.checkBox1_Click);
            // 
            // dropDownInsert
            // 
            resources.ApplyResources(this.dropDownInsert, "dropDownInsert");
            this.dropDownInsert.Name = "dropDownInsert";
            // 
            // dropDownDelete
            // 
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
            // version
            // 
            resources.ApplyResources(this.version, "version");
            this.version.Name = "version";
            // 
            // syracuseTemplateTab
            // 
            this.syracuseTemplateTab.Groups.Add(this.groupSave);
            this.syracuseTemplateTab.Groups.Add(this.groupReporting);
            this.syracuseTemplateTab.Groups.Add(this.groupLocale);
            this.syracuseTemplateTab.Groups.Add(this.group4);
            this.syracuseTemplateTab.Groups.Add(this.group5);
            resources.ApplyResources(this.syracuseTemplateTab, "syracuseTemplateTab");
            this.syracuseTemplateTab.Name = "syracuseTemplateTab";
            // 
            // groupSave
            // 
            this.groupSave.Items.Add(this.buttonSave);
            this.groupSave.Items.Add(this.buttonSaveAs);
            resources.ApplyResources(this.groupSave, "groupSave");
            this.groupSave.Name = "groupSave";
            // 
            // groupReporting
            // 
            this.groupReporting.Items.Add(this.buttonRefreshReport);
            this.groupReporting.Items.Add(this.buttonPreview);
            this.groupReporting.Items.Add(this.checkBoxShowTemplatePane);
            this.groupReporting.Items.Add(this.toggleMakeSum);
            resources.ApplyResources(this.groupReporting, "groupReporting");
            this.groupReporting.Name = "groupReporting";
            // 
            // checkBoxShowTemplatePane
            // 
            resources.ApplyResources(this.checkBoxShowTemplatePane, "checkBoxShowTemplatePane");
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
            this.checkBoxShowTemplatePane.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.checkBoxShowTemplatePane_Click);
            // 
            // groupLocale
            // 
            this.groupLocale.Items.Add(this.dropDownLocale);
            resources.ApplyResources(this.groupLocale, "groupLocale");
            this.groupLocale.Name = "groupLocale";
            // 
            // dropDownLocale
            // 
            resources.ApplyResources(this.dropDownLocale, "dropDownLocale");
            this.dropDownLocale.Name = "dropDownLocale";
            // 
            // group4
            // 
            this.group4.Items.Add(this.label1);
            this.group4.Items.Add(this.button1);
            this.group4.Items.Add(this.label2);
            resources.ApplyResources(this.group4, "group4");
            this.group4.Name = "group4";
            // 
            // label1
            // 
            resources.ApplyResources(this.label1, "label1");
            this.label1.Name = "label1";
            // 
            // label2
            // 
            resources.ApplyResources(this.label2, "label2");
            this.label2.Name = "label2";
            // 
            // group5
            // 
            this.group5.Items.Add(this.buttonCleanup);
            resources.ApplyResources(this.group5, "group5");
            this.group5.Name = "group5";
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
            // buttonSettings
            // 
            this.buttonSettings.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSettings.Image = global::ExcelAddIn.Properties.Resources.settings;
            resources.ApplyResources(this.buttonSettings, "buttonSettings");
            this.buttonSettings.Name = "buttonSettings";
            this.buttonSettings.ShowImage = true;
            this.buttonSettings.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSettings_Click);
            // 
            // buttonRefreshAll
            // 
            this.buttonRefreshAll.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonRefreshAll.Image = global::ExcelAddIn.Properties.Resources.refresh;
            resources.ApplyResources(this.buttonRefreshAll, "buttonRefreshAll");
            this.buttonRefreshAll.Name = "buttonRefreshAll";
            this.buttonRefreshAll.ShowImage = true;
            this.buttonRefreshAll.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefreshAll_Click);
            // 
            // buttonPublish
            // 
            this.buttonPublish.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonPublish.Image = global::ExcelAddIn.Properties.Resources.save;
            resources.ApplyResources(this.buttonPublish, "buttonPublish");
            this.buttonPublish.Name = "buttonPublish";
            this.buttonPublish.ShowImage = true;
            this.buttonPublish.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPublish_Click);
            // 
            // buttonUpdate
            // 
            resources.ApplyResources(this.buttonUpdate, "buttonUpdate");
            this.buttonUpdate.Image = global::ExcelAddIn.Properties.Resources.refresh;
            this.buttonUpdate.Name = "buttonUpdate";
            this.buttonUpdate.ShowImage = true;
            this.buttonUpdate.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonUpdate_Click);
            // 
            // buttonSave
            // 
            this.buttonSave.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSave.Image = global::ExcelAddIn.Properties.Resources.sauvegarder2;
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
            // toggleMakeSum
            // 
            resources.ApplyResources(this.toggleMakeSum, "toggleMakeSum");
            this.toggleMakeSum.Name = "toggleMakeSum";
            // 
            // button1
            // 
            resources.ApplyResources(this.button1, "button1");
            this.button1.Image = global::ExcelAddIn.Properties.Resources.refresh;
            this.button1.Name = "button1";
            this.button1.ShowImage = true;
            this.button1.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonUpdate_Click);
            // 
            // buttonCleanup
            // 
            resources.ApplyResources(this.buttonCleanup, "buttonCleanup");
            this.buttonCleanup.Name = "buttonCleanup";
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.Excel.Workbook";
            this.Tabs.Add(this.syracuseTab);
            this.Tabs.Add(this.syracuseTemplateTab);
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
            this.syracuseTab.ResumeLayout(false);
            this.syracuseTab.PerformLayout();
            this.group1.ResumeLayout(false);
            this.group1.PerformLayout();
            this.group2.ResumeLayout(false);
            this.group2.PerformLayout();
            this.group3.ResumeLayout(false);
            this.group3.PerformLayout();
            this.groupSageX3.ResumeLayout(false);
            this.groupSageX3.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();
            this.syracuseTemplateTab.ResumeLayout(false);
            this.syracuseTemplateTab.PerformLayout();
            this.groupSave.ResumeLayout(false);
            this.groupSave.PerformLayout();
            this.groupReporting.ResumeLayout(false);
            this.groupReporting.PerformLayout();
            this.groupLocale.ResumeLayout(false);
            this.groupLocale.PerformLayout();
            this.group4.ResumeLayout(false);
            this.group4.PerformLayout();
            this.group5.ResumeLayout(false);
            this.group5.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSageX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group1;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonConnect;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group2;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonServer;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group3;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownDelete;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshAll;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBox1;
        public Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownInsert;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
        private Microsoft.Office.Tools.Ribbon.RibbonTab syracuseTemplateTab;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSaveAs;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupReporting;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonToggleButton toggleMakeSum;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupLocale;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownLocale;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group4;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel label1;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton button1;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel label2;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group5;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonCleanup;
        private Microsoft.Office.Tools.Ribbon.RibbonTab syracuseTab;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
