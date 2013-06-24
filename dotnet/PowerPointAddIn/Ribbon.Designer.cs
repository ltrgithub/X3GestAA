﻿namespace PowerPointAddIn
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
            InitializeComponent();
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
            this.tabSageERPX3 = this.Factory.CreateRibbonTab();
            this.groupSave = this.Factory.CreateRibbonGroup();
            this.buttonSave = this.Factory.CreateRibbonButton();
            this.buttonSaveAs = this.Factory.CreateRibbonButton();
            this.groupRefresh = this.Factory.CreateRibbonGroup();
            this.buttonRefresh = this.Factory.CreateRibbonButton();
            this.buttonRefreshAll = this.Factory.CreateRibbonButton();
            this.groupVersion = this.Factory.CreateRibbonGroup();
            this.installedVersion = this.Factory.CreateRibbonLabel();
            this.buttonUpdate = this.Factory.CreateRibbonButton();
            this.version = this.Factory.CreateRibbonLabel();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupSave.SuspendLayout();
            this.groupRefresh.SuspendLayout();
            this.groupVersion.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupSave);
            this.tabSageERPX3.Groups.Add(this.groupRefresh);
            this.tabSageERPX3.Groups.Add(this.groupVersion);
            resources.ApplyResources(this.tabSageERPX3, "tabSageERPX3");
            this.tabSageERPX3.Name = "tabSageERPX3";
            // 
            // groupSave
            // 
            this.groupSave.Items.Add(this.buttonSave);
            this.groupSave.Items.Add(this.buttonSaveAs);
            resources.ApplyResources(this.groupSave, "groupSave");
            this.groupSave.Name = "groupSave";
            // 
            // buttonSave
            // 
            this.buttonSave.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonSave, "buttonSave");
            this.buttonSave.Image = global::PowerPointAddIn.Properties.Resources.sauvegarder;
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.ShowImage = true;
            this.buttonSave.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSave_Click);
            // 
            // buttonSaveAs
            // 
            this.buttonSaveAs.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonSaveAs, "buttonSaveAs");
            this.buttonSaveAs.Image = global::PowerPointAddIn.Properties.Resources.sauvegarder2;
            this.buttonSaveAs.Name = "buttonSaveAs";
            this.buttonSaveAs.ShowImage = true;
            this.buttonSaveAs.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSaveAs_Click);
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
            resources.ApplyResources(this.buttonRefresh, "buttonRefresh");
            this.buttonRefresh.Image = global::PowerPointAddIn.Properties.Resources.refresh;
            this.buttonRefresh.Name = "buttonRefresh";
            this.buttonRefresh.ShowImage = true;
            this.buttonRefresh.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefresh_Click);
            // 
            // buttonRefreshAll
            // 
            this.buttonRefreshAll.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonRefreshAll, "buttonRefreshAll");
            this.buttonRefreshAll.Image = global::PowerPointAddIn.Properties.Resources.refresh_all;
            this.buttonRefreshAll.Name = "buttonRefreshAll";
            this.buttonRefreshAll.ShowImage = true;
            this.buttonRefreshAll.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefreshAll_Click);
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
            // checkBoxShowTemplatePane
            // 
            resources.ApplyResources(this.checkBoxShowTemplatePane, "checkBoxShowTemplatePane");
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
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
            this.groupSave.ResumeLayout(false);
            this.groupSave.PerformLayout();
            this.groupRefresh.ResumeLayout(false);
            this.groupRefresh.PerformLayout();
            this.groupVersion.ResumeLayout(false);
            this.groupVersion.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSaveAs;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupRefresh;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefresh;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshAll;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel installedVersion;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonUpdate;
        internal Microsoft.Office.Tools.Ribbon.RibbonLabel version;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
