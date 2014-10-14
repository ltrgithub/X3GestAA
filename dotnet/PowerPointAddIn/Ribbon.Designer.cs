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
            this.tabSageERPX3 = this.Factory.CreateRibbonTab();
            this.groupPublish = this.Factory.CreateRibbonGroup();
            this.buttonPublish = this.Factory.CreateRibbonButton();
            this.galleryPublishAs = this.Factory.CreateRibbonGallery();
            this.groupRefresh = this.Factory.CreateRibbonGroup();
            this.buttonRefresh = this.Factory.CreateRibbonButton();
            this.buttonRefreshAll = this.Factory.CreateRibbonButton();
            this.groupSettings = this.Factory.CreateRibbonGroup();
            this.comboBoxServerLocation = this.Factory.CreateRibbonComboBox();
            this.groupVersion = this.Factory.CreateRibbonGroup();
            this.installedVersion = this.Factory.CreateRibbonLabel();
            this.buttonUpdate = this.Factory.CreateRibbonButton();
            this.version = this.Factory.CreateRibbonLabel();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupPublish.SuspendLayout();
            this.groupRefresh.SuspendLayout();
            this.groupSettings.SuspendLayout();
            this.groupVersion.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupPublish);
            this.tabSageERPX3.Groups.Add(this.groupRefresh);
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
            // groupRefresh
            // 
            this.groupRefresh.Items.Add(this.buttonRefresh);
            this.groupRefresh.Items.Add(this.buttonRefreshAll);
            resources.ApplyResources(this.groupRefresh, "groupRefresh");
            this.groupRefresh.Name = "groupRefresh";
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
            this.buttonUpdate.Image = global::PowerPointAddIn.Properties.Resources.refresh;
            this.buttonUpdate.Name = "buttonUpdate";
            this.buttonUpdate.ShowImage = true;
            this.buttonUpdate.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonUpdate_Click);
            // 
            // version
            // 
            this.version.Name = "version";
            // 
            // checkBoxShowTemplatePane
            // 
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
            // 
            // buttonRefreshReport
            // 
            this.buttonRefreshReport.Name = "buttonRefreshReport";
            // 
            // buttonPreview
            // 
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
            this.groupRefresh.ResumeLayout(false);
            this.groupRefresh.PerformLayout();
            this.groupSettings.ResumeLayout(false);
            this.groupSettings.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupRefresh;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefresh;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshAll;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonComboBox comboBoxServerLocation;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonGallery galleryPublishAs;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
