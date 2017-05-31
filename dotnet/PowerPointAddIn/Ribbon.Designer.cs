using System.Threading;
using System.Globalization;
using Microsoft.Win32;

namespace PowerPointAddIn
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
            int languageID = 0;
            string languageCode = string.Empty;
            const string keyEntry = "UILanguage";
            const string keyEntryTag = "UILanguageTag";
            // 16.0 Office 2016
            // 15.0 Office 2013
            // 14.0 2010
            // 12.0 2003
            string[] versions = { "16.0", "15.0", "14.0", "12.0" };
            foreach (string version in versions)
            {
                string reg = @"Software\Microsoft\Office\" + version + "\\Common\\LanguageResources";
                try
                {
                    RegistryKey k = Registry.CurrentUser.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageID = (int)k.GetValue(keyEntry);
                }
                catch { }

                try
                {
                    RegistryKey k = Registry.CurrentUser.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntryTag) != null) languageCode = k.GetValue(keyEntryTag).ToString();
                }
                catch { }

                try
                {
                    RegistryKey k = Registry.LocalMachine.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntry) != null) languageID = (int)k.GetValue(keyEntry);
                }
                catch { }

                try
                {
                    RegistryKey k = Registry.LocalMachine.OpenSubKey(reg);
                    if (k != null && k.GetValue(keyEntryTag) != null) languageCode = k.GetValue(keyEntryTag).ToString();
                }
                catch { }

                if (languageID > 0 || languageCode.Length > 0)
                {
                    break;
                }
            }

            if (languageID > 0)
            {
                Thread.CurrentThread.CurrentUICulture = new CultureInfo(languageID);
            }
            else if (languageCode.Length > 0)
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
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.tabSageERPX3 = this.Factory.CreateRibbonTab();
            this.groupPublish = this.Factory.CreateRibbonGroup();
            this.buttonPublish = this.Factory.CreateRibbonButton();
            this.galleryPublishAs = this.Factory.CreateRibbonGallery();
            this.groupReporting = this.Factory.CreateRibbonGroup();
            this.buttonRefresh = this.Factory.CreateRibbonButton();
            this.buttonRefreshAll = this.Factory.CreateRibbonButton();
            this.groupSettings = this.Factory.CreateRibbonGroup();
            this.box1 = this.Factory.CreateRibbonBox();
            this.comboBoxServerLocation = this.Factory.CreateRibbonComboBox();
            this.serverLocationsButton = this.Factory.CreateRibbonButton();
            this.buttonDisconnect = this.Factory.CreateRibbonButton();
            this.groupVersion = this.Factory.CreateRibbonGroup();
            this.installedVersion = this.Factory.CreateRibbonLabel();
            this.buttonUpdate = this.Factory.CreateRibbonButton();
            this.version = this.Factory.CreateRibbonLabel();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupPublish.SuspendLayout();
            this.groupReporting.SuspendLayout();
            this.groupSettings.SuspendLayout();
            this.box1.SuspendLayout();
            this.groupVersion.SuspendLayout();
            this.SuspendLayout();
            // 
            // checkBoxShowTemplatePane
            // 
            resources.ApplyResources(this.checkBoxShowTemplatePane, "checkBoxShowTemplatePane");
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupPublish);
            this.tabSageERPX3.Groups.Add(this.groupReporting);
            this.tabSageERPX3.Groups.Add(this.groupSettings);
            this.tabSageERPX3.Groups.Add(this.groupVersion);
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
            this.buttonPublish.Image = global::PowerPointAddIn.Properties.Resources.save;
            resources.ApplyResources(this.buttonPublish, "buttonPublish");
            this.buttonPublish.Name = "buttonPublish";
            this.buttonPublish.ShowImage = true;
            this.buttonPublish.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPublish_Click);
            // 
            // galleryPublishAs
            // 
            this.galleryPublishAs.ColumnCount = 1;
            this.galleryPublishAs.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.galleryPublishAs.Image = global::PowerPointAddIn.Properties.Resources.sauvegarder;
            resources.ApplyResources(ribbonDropDownItemImpl1, "ribbonDropDownItemImpl1");
            this.galleryPublishAs.Items.Add(ribbonDropDownItemImpl1);
            resources.ApplyResources(this.galleryPublishAs, "galleryPublishAs");
            this.galleryPublishAs.Name = "galleryPublishAs";
            this.galleryPublishAs.ShowImage = true;
            this.galleryPublishAs.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.galleryPublishAs_Click);
            // 
            // groupReporting
            // 
            this.groupReporting.Items.Add(this.buttonRefresh);
            this.groupReporting.Items.Add(this.buttonRefreshAll);
            resources.ApplyResources(this.groupReporting, "groupReporting");
            this.groupReporting.Name = "groupReporting";
            // 
            // buttonRefresh
            // 
            this.buttonRefresh.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonRefresh.Image = global::PowerPointAddIn.Properties.Resources.refresh;
            resources.ApplyResources(this.buttonRefresh, "buttonRefresh");
            this.buttonRefresh.Name = "buttonRefresh";
            this.buttonRefresh.ShowImage = true;
            this.buttonRefresh.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefresh_Click);
            // 
            // buttonRefreshAll
            // 
            this.buttonRefreshAll.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonRefreshAll.Image = global::PowerPointAddIn.Properties.Resources.refresh_all;
            resources.ApplyResources(this.buttonRefreshAll, "buttonRefreshAll");
            this.buttonRefreshAll.Name = "buttonRefreshAll";
            this.buttonRefreshAll.ShowImage = true;
            this.buttonRefreshAll.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefreshAll_Click);
            // 
            // groupSettings
            // 
            this.groupSettings.Items.Add(this.box1);
            this.groupSettings.Items.Add(this.buttonDisconnect);
            resources.ApplyResources(this.groupSettings, "groupSettings");
            this.groupSettings.Name = "groupSettings";
            // 
            // box1
            // 
            this.box1.Items.Add(this.comboBoxServerLocation);
            this.box1.Items.Add(this.serverLocationsButton);
            this.box1.Name = "box1";
            // 
            // comboBoxServerLocation
            // 
            resources.ApplyResources(this.comboBoxServerLocation, "comboBoxServerLocation");
            this.comboBoxServerLocation.Name = "comboBoxServerLocation";
            this.comboBoxServerLocation.TextChanged += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.comboBoxServerLocation_TextChanged);
            // 
            // serverLocationsButton
            // 
            resources.ApplyResources(this.serverLocationsButton, "serverLocationsButton");
            this.serverLocationsButton.Name = "serverLocationsButton";
            this.serverLocationsButton.ShowImage = true;
            this.serverLocationsButton.ShowLabel = false;
            this.serverLocationsButton.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.serverLocationsButton_Click);
            // 
            // buttonDisconnect
            // 
            this.buttonDisconnect.Image = global::PowerPointAddIn.Properties.Resources.logout;
            resources.ApplyResources(this.buttonDisconnect, "buttonDisconnect");
            this.buttonDisconnect.Name = "buttonDisconnect";
            this.buttonDisconnect.ShowImage = true;
            this.buttonDisconnect.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonDisconnect_Click);
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
            this.buttonUpdate.Image = global::PowerPointAddIn.Properties.Resources.refresh;
            this.buttonUpdate.Name = "buttonUpdate";
            this.buttonUpdate.ShowImage = true;
            this.buttonUpdate.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonUpdate_Click);
            // 
            // version
            // 
            resources.ApplyResources(this.version, "version");
            this.version.Name = "version";
            // 
            // buttonRefreshReport
            // 
            resources.ApplyResources(this.buttonRefreshReport, "buttonRefreshReport");
            this.buttonRefreshReport.Name = "buttonRefreshReport";
            // 
            // buttonPreview
            // 
            resources.ApplyResources(this.buttonPreview, "buttonPreview");
            this.buttonPreview.Name = "buttonPreview";
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.PowerPoint.Presentation";
            this.Tabs.Add(this.tabSageERPX3);
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
            this.tabSageERPX3.ResumeLayout(false);
            this.tabSageERPX3.PerformLayout();
            this.groupPublish.ResumeLayout(false);
            this.groupPublish.PerformLayout();
            this.groupReporting.ResumeLayout(false);
            this.groupReporting.PerformLayout();
            this.groupSettings.ResumeLayout(false);
            this.groupSettings.PerformLayout();
            this.box1.ResumeLayout(false);
            this.box1.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupReporting;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefresh;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshAll;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonGallery galleryPublishAs;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonDisconnect;
        internal Microsoft.Office.Tools.Ribbon.RibbonBox box1;
        internal Microsoft.Office.Tools.Ribbon.RibbonComboBox comboBoxServerLocation;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton serverLocationsButton;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
