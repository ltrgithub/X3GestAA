using System.Threading;
using System.Globalization;
using Microsoft.Win32;

namespace WordAddIn
{
    partial class Ribbon : Microsoft.Office.Tools.Ribbon.RibbonBase
    {
        /// <summary>
        /// Erforderliche Designervariable.
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
        /// Verwendete Ressourcen bereinigen.
        /// </summary>
        /// <param name="disposing">True, wenn verwaltete Ressourcen gelöscht werden sollen; andernfalls False.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Vom Komponenten-Designer generierter Code

        /// <summary>
        /// Erforderliche Methode für die Designerunterstützung.
        /// Der Inhalt der Methode darf nicht mit dem Code-Editor geändert werden.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Ribbon));
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl1 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl2 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl3 = this.Factory.CreateRibbonDropDownItem();
            this.tabSageERPX3 = this.Factory.CreateRibbonTab();
            this.groupPublish = this.Factory.CreateRibbonGroup();
            this.buttonPublish = this.Factory.CreateRibbonButton();
            this.galleryPublishAs = this.Factory.CreateRibbonGallery();
            this.groupReporting = this.Factory.CreateRibbonGroup();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.toggleMakeSum = this.Factory.CreateRibbonToggleButton();
            this.groupTemplate = this.Factory.CreateRibbonGroup();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.dropDownLocale = this.Factory.CreateRibbonDropDown();
            this.groupSettings = this.Factory.CreateRibbonGroup();
            this.comboBoxServerLocation = this.Factory.CreateRibbonComboBox();
            this.groupVersion = this.Factory.CreateRibbonGroup();
            this.installedVersion = this.Factory.CreateRibbonLabel();
            this.buttonUpdate = this.Factory.CreateRibbonButton();
            this.version = this.Factory.CreateRibbonLabel();
            this.group1 = this.Factory.CreateRibbonGroup();
            this.buttonCleanup = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupPublish.SuspendLayout();
            this.groupReporting.SuspendLayout();
            this.groupTemplate.SuspendLayout();
            this.groupSettings.SuspendLayout();
            this.groupVersion.SuspendLayout();
            this.group1.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupPublish);
            this.tabSageERPX3.Groups.Add(this.groupReporting);
            this.tabSageERPX3.Groups.Add(this.groupTemplate);
            this.tabSageERPX3.Groups.Add(this.groupSettings);
            this.tabSageERPX3.Groups.Add(this.groupVersion);
            this.tabSageERPX3.Groups.Add(this.group1);
            resources.ApplyResources(this.tabSageERPX3, "tabSageERPX3");
            this.tabSageERPX3.Name = "tabSageERPX3";
            // 
            // groupPublish
            // 
            this.groupPublish.Items.Add(this.buttonPublish);
            this.groupPublish.Items.Add(this.galleryPublishAs);
            resources.ApplyResources(this.groupPublish, "groupPublish");
            this.groupPublish.Name = "groupPublish";
            // 
            // buttonPublish
            // 
            this.buttonPublish.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonPublish.Image = global::WordAddIn.Properties.Resources.sauvegarder;
            resources.ApplyResources(this.buttonPublish, "buttonPublish");
            this.buttonPublish.Name = "buttonPublish";
            this.buttonPublish.ShowImage = true;
            this.buttonPublish.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPublish_Click);
            // 
            // galleryPublishAs
            // 
            this.galleryPublishAs.ColumnCount = 1;
            this.galleryPublishAs.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.galleryPublishAs.Image = global::WordAddIn.Properties.Resources.sauvegarder2;
            resources.ApplyResources(ribbonDropDownItemImpl1, "ribbonDropDownItemImpl1");
            resources.ApplyResources(ribbonDropDownItemImpl2, "ribbonDropDownItemImpl2");
            resources.ApplyResources(ribbonDropDownItemImpl3, "ribbonDropDownItemImpl3");
            this.galleryPublishAs.Items.Add(ribbonDropDownItemImpl1);
            this.galleryPublishAs.Items.Add(ribbonDropDownItemImpl2);
            this.galleryPublishAs.Items.Add(ribbonDropDownItemImpl3);
            resources.ApplyResources(this.galleryPublishAs, "galleryPublishAs");
            this.galleryPublishAs.Name = "galleryPublishAs";
            this.galleryPublishAs.ShowImage = true;
            this.galleryPublishAs.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.gallery1_Click);
            // 
            // groupReporting
            // 
            this.groupReporting.Items.Add(this.buttonRefreshReport);
            this.groupReporting.Items.Add(this.buttonPreview);
            this.groupReporting.Items.Add(this.toggleMakeSum);
            resources.ApplyResources(this.groupReporting, "groupReporting");
            this.groupReporting.Name = "groupReporting";
            // 
            // buttonRefreshReport
            // 
            this.buttonRefreshReport.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonRefreshReport, "buttonRefreshReport");
            this.buttonRefreshReport.Image = global::WordAddIn.Properties.Resources.refresh;
            this.buttonRefreshReport.Name = "buttonRefreshReport";
            this.buttonRefreshReport.ShowImage = true;
            this.buttonRefreshReport.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefreshReport_Click);
            // 
            // buttonPreview
            // 
            this.buttonPreview.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonPreview.Image = global::WordAddIn.Properties.Resources.preview;
            resources.ApplyResources(this.buttonPreview, "buttonPreview");
            this.buttonPreview.Name = "buttonPreview";
            this.buttonPreview.ShowImage = true;
            this.buttonPreview.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPreview_Click);
            // 
            // toggleMakeSum
            // 
            resources.ApplyResources(this.toggleMakeSum, "toggleMakeSum");
            this.toggleMakeSum.Name = "toggleMakeSum";
            this.toggleMakeSum.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.toggleMakeSum_Click);
            // 
            // groupTemplate
            // 
            this.groupTemplate.Items.Add(this.dropDownLocale);
            this.groupTemplate.Items.Add(this.checkBoxShowTemplatePane);
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
            this.buttonUpdate.Image = global::WordAddIn.Properties.Resources.refresh;
            this.buttonUpdate.Name = "buttonUpdate";
            this.buttonUpdate.ShowImage = true;
            this.buttonUpdate.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonUpdate_Click);
            // 
            // version
            // 
            resources.ApplyResources(this.version, "version");
            this.version.Name = "version";
            // 
            // group1
            // 
            this.group1.Items.Add(this.buttonCleanup);
            resources.ApplyResources(this.group1, "group1");
            this.group1.Name = "group1";
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
            this.RibbonType = "Microsoft.Word.Document";
            this.Tabs.Add(this.tabSageERPX3);
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
            this.tabSageERPX3.ResumeLayout(false);
            this.tabSageERPX3.PerformLayout();
            this.groupPublish.ResumeLayout(false);
            this.groupPublish.PerformLayout();
            this.groupReporting.ResumeLayout(false);
            this.groupReporting.PerformLayout();
            this.groupTemplate.ResumeLayout(false);
            this.groupTemplate.PerformLayout();
            this.groupSettings.ResumeLayout(false);
            this.groupSettings.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();
            this.group1.ResumeLayout(false);
            this.group1.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupReporting;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupTemplate;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownLocale;
        internal Microsoft.Office.Tools.Ribbon.RibbonToggleButton toggleMakeSum;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group1;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonCleanup;
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
