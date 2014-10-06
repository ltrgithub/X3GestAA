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
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl7 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl8 = this.Factory.CreateRibbonDropDownItem();
            this.syracuseTab = this.Factory.CreateRibbonTab();
            this.groupPublishDocument = this.Factory.CreateRibbonGroup();
            this.buttonPublish = this.Factory.CreateRibbonButton();
            this.galleryPublishAs = this.Factory.CreateRibbonGallery();
            this.groupReporting = this.Factory.CreateRibbonGroup();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.calculateSumButton = this.Factory.CreateRibbonToggleButton();
            this.groupTemplate = this.Factory.CreateRibbonGroup();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.dropDownLocale = this.Factory.CreateRibbonDropDown();
            this.groupSettings = this.Factory.CreateRibbonGroup();
            this.comboBoxServerLocation = this.Factory.CreateRibbonComboBox();
            this.dataSourcesGroup = this.Factory.CreateRibbonGroup();
            this.buttonSettings = this.Factory.CreateRibbonButton();
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
            this.groupPublishDocument.SuspendLayout();
            this.groupReporting.SuspendLayout();
            this.groupTemplate.SuspendLayout();
            this.groupSettings.SuspendLayout();
            this.dataSourcesGroup.SuspendLayout();
            this.groupSageX3.SuspendLayout();
            this.groupVersion.SuspendLayout();
            this.cleanupTemplateGroup.SuspendLayout();
            // 
            // syracuseTab
            // 
            this.syracuseTab.Groups.Add(this.groupPublishDocument);
            this.syracuseTab.Groups.Add(this.groupReporting);
            this.syracuseTab.Groups.Add(this.groupTemplate);
            this.syracuseTab.Groups.Add(this.groupSettings);
            this.syracuseTab.Groups.Add(this.dataSourcesGroup);
            this.syracuseTab.Groups.Add(this.groupSageX3);
            this.syracuseTab.Groups.Add(this.groupVersion);
            this.syracuseTab.Groups.Add(this.cleanupTemplateGroup);
            resources.ApplyResources(this.syracuseTab, "syracuseTab");
            this.syracuseTab.Name = "syracuseTab";
            // 
            // groupPublishDocument
            // 
            this.groupPublishDocument.Items.Add(this.buttonPublish);
            this.groupPublishDocument.Items.Add(this.galleryPublishAs);
            resources.ApplyResources(this.groupPublishDocument, "groupPublishDocument");
            this.groupPublishDocument.Name = "groupPublishDocument";
            // 
            // buttonPublish
            // 
            this.buttonPublish.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonPublish.Image = global::ExcelAddIn.Properties.Resources.sauvegarder;
            resources.ApplyResources(this.buttonPublish, "buttonPublish");
            this.buttonPublish.Name = "buttonPublish";
            this.buttonPublish.ShowImage = true;
            this.buttonPublish.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPublish_Click_1);
            // 
            // galleryPublishAs
            // 
            this.galleryPublishAs.ColumnCount = 1;
            this.galleryPublishAs.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.galleryPublishAs.Image = global::ExcelAddIn.Properties.Resources.sauvegarder2;
            resources.ApplyResources(ribbonDropDownItemImpl1, "ribbonDropDownItemImpl1");
            resources.ApplyResources(ribbonDropDownItemImpl2, "ribbonDropDownItemImpl2");
            this.galleryPublishAs.Items.Add(ribbonDropDownItemImpl1);
            this.galleryPublishAs.Items.Add(ribbonDropDownItemImpl2);
            resources.ApplyResources(this.galleryPublishAs, "galleryPublishAs");
            this.galleryPublishAs.Name = "galleryPublishAs";
            this.galleryPublishAs.ShowImage = true;
            this.galleryPublishAs.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.galleryPublishAs_Click);
            // 
            // groupReporting
            // 
            this.groupReporting.Items.Add(this.buttonRefreshReport);
            this.groupReporting.Items.Add(this.buttonPreview);
            this.groupReporting.Items.Add(this.calculateSumButton);
            resources.ApplyResources(this.groupReporting, "groupReporting");
            this.groupReporting.Name = "groupReporting";
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
            // calculateSumButton
            // 
            resources.ApplyResources(this.calculateSumButton, "calculateSumButton");
            this.calculateSumButton.Name = "calculateSumButton";
            // 
            // groupTemplate
            // 
            this.groupTemplate.Items.Add(this.checkBoxShowTemplatePane);
            this.groupTemplate.Items.Add(this.dropDownLocale);
            resources.ApplyResources(this.groupTemplate, "groupTemplate");
            this.groupTemplate.Name = "groupTemplate";
            // 
            // checkBoxShowTemplatePane
            // 
            resources.ApplyResources(this.checkBoxShowTemplatePane, "checkBoxShowTemplatePane");
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
            this.checkBoxShowTemplatePane.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.checkBoxShowTemplatePane_Click);
            // 
            // dropDownLocale
            // 
            resources.ApplyResources(this.dropDownLocale, "dropDownLocale");
            this.dropDownLocale.Name = "dropDownLocale";
            this.dropDownLocale.SelectionChanged += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.dropDownLocale_SelectionChanged);
            // 
            // groupSettings
            // 
            this.groupSettings.Items.Add(this.comboBoxServerLocation);
            resources.ApplyResources(this.groupSettings, "groupSettings");
            this.groupSettings.Name = "groupSettings";
            // 
            // comboBoxServerLocation
            // 
            resources.ApplyResources(this.comboBoxServerLocation, "comboBoxServerLocation");
            this.comboBoxServerLocation.Name = "comboBoxServerLocation";
            this.comboBoxServerLocation.TextChanged += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.comboBoxServerLocation_TextChanged);
            // 
            // dataSourcesGroup
            // 
            this.dataSourcesGroup.Items.Add(this.buttonSettings);
            resources.ApplyResources(this.dataSourcesGroup, "dataSourcesGroup");
            this.dataSourcesGroup.Name = "dataSourcesGroup";
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
            resources.ApplyResources(ribbonDropDownItemImpl3, "ribbonDropDownItemImpl3");
            resources.ApplyResources(ribbonDropDownItemImpl4, "ribbonDropDownItemImpl4");
            resources.ApplyResources(ribbonDropDownItemImpl5, "ribbonDropDownItemImpl5");
            this.dropDownInsert.Items.Add(ribbonDropDownItemImpl3);
            this.dropDownInsert.Items.Add(ribbonDropDownItemImpl4);
            this.dropDownInsert.Items.Add(ribbonDropDownItemImpl5);
            resources.ApplyResources(this.dropDownInsert, "dropDownInsert");
            this.dropDownInsert.Name = "dropDownInsert";
            // 
            // dropDownDelete
            // 
            resources.ApplyResources(ribbonDropDownItemImpl6, "ribbonDropDownItemImpl6");
            resources.ApplyResources(ribbonDropDownItemImpl7, "ribbonDropDownItemImpl7");
            resources.ApplyResources(ribbonDropDownItemImpl8, "ribbonDropDownItemImpl8");
            this.dropDownDelete.Items.Add(ribbonDropDownItemImpl6);
            this.dropDownDelete.Items.Add(ribbonDropDownItemImpl7);
            this.dropDownDelete.Items.Add(ribbonDropDownItemImpl8);
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
            this.groupPublishDocument.ResumeLayout(false);
            this.groupPublishDocument.PerformLayout();
            this.groupReporting.ResumeLayout(false);
            this.groupReporting.PerformLayout();
            this.groupTemplate.ResumeLayout(false);
            this.groupTemplate.PerformLayout();
            this.groupSettings.ResumeLayout(false);
            this.groupSettings.PerformLayout();
            this.dataSourcesGroup.ResumeLayout(false);
            this.dataSourcesGroup.PerformLayout();
            this.groupSageX3.ResumeLayout(false);
            this.groupSageX3.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();
            this.cleanupTemplateGroup.ResumeLayout(false);
            this.cleanupTemplateGroup.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSageX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup dataSourcesGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownDelete;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox actionPanelCheckBox;
        public Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownInsert;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
        private Microsoft.Office.Tools.Ribbon.RibbonTab syracuseTab;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupPublishDocument;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupReporting;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonToggleButton calculateSumButton;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupTemplate;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownLocale;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup cleanupTemplateGroup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonCleanup;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonGallery galleryPublishAs;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonComboBox comboBoxServerLocation;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
