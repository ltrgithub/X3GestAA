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
            this.groupServer = this.Factory.CreateRibbonGroup();
            this.groupMailMerge = this.Factory.CreateRibbonGroup();
            this.groupSave = this.Factory.CreateRibbonGroup();
            this.groupReporting = this.Factory.CreateRibbonGroup();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.buttonConnect = this.Factory.CreateRibbonSplitButton();
            this.buttonServerSettings = this.Factory.CreateRibbonButton();
            this.buttonCreateMailMerge = this.Factory.CreateRibbonButton();
            this.buttonSave = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupServer.SuspendLayout();
            this.groupMailMerge.SuspendLayout();
            this.groupSave.SuspendLayout();
            this.groupReporting.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupServer);
            this.tabSageERPX3.Groups.Add(this.groupMailMerge);
            this.tabSageERPX3.Groups.Add(this.groupSave);
            this.tabSageERPX3.Groups.Add(this.groupReporting);
            resources.ApplyResources(this.tabSageERPX3, "tabSageERPX3");
            this.tabSageERPX3.Name = "tabSageERPX3";
            // 
            // groupServer
            // 
            this.groupServer.Items.Add(this.buttonConnect);
            resources.ApplyResources(this.groupServer, "groupServer");
            this.groupServer.Name = "groupServer";
            // 
            // groupMailMerge
            // 
            this.groupMailMerge.Items.Add(this.buttonCreateMailMerge);
            resources.ApplyResources(this.groupMailMerge, "groupMailMerge");
            this.groupMailMerge.Name = "groupMailMerge";
            // 
            // groupSave
            // 
            this.groupSave.Items.Add(this.buttonSave);
            resources.ApplyResources(this.groupSave, "groupSave");
            this.groupSave.Name = "groupSave";
            // 
            // groupReporting
            // 
            this.groupReporting.Items.Add(this.checkBoxShowTemplatePane);
            this.groupReporting.Items.Add(this.buttonPreview);
            resources.ApplyResources(this.groupReporting, "groupReporting");
            this.groupReporting.Name = "groupReporting";
            // 
            // checkBoxShowTemplatePane
            // 
            resources.ApplyResources(this.checkBoxShowTemplatePane, "checkBoxShowTemplatePane");
            this.checkBoxShowTemplatePane.Name = "checkBoxShowTemplatePane";
            this.checkBoxShowTemplatePane.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.checkBoxShowTemplatePane_Click);
            // 
            // buttonConnect
            // 
            this.buttonConnect.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonConnect.Image = global::WordAddIn.Properties.Resources.connect;
            this.buttonConnect.Items.Add(this.buttonServerSettings);
            resources.ApplyResources(this.buttonConnect, "buttonConnect");
            this.buttonConnect.Name = "buttonConnect";
            this.buttonConnect.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonConnect_Click);
            // 
            // buttonServerSettings
            // 
            this.buttonServerSettings.Image = global::WordAddIn.Properties.Resources.settings;
            resources.ApplyResources(this.buttonServerSettings, "buttonServerSettings");
            this.buttonServerSettings.Name = "buttonServerSettings";
            this.buttonServerSettings.ShowImage = true;
            this.buttonServerSettings.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonServerSettings_Click);
            // 
            // buttonCreateMailMerge
            // 
            this.buttonCreateMailMerge.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonCreateMailMerge.Image = global::WordAddIn.Properties.Resources.mailmerge;
            resources.ApplyResources(this.buttonCreateMailMerge, "buttonCreateMailMerge");
            this.buttonCreateMailMerge.Name = "buttonCreateMailMerge";
            this.buttonCreateMailMerge.ShowImage = true;
            this.buttonCreateMailMerge.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonCreateMailMerge_Click);
            // 
            // buttonSave
            // 
            this.buttonSave.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSave.Image = global::WordAddIn.Properties.Resources.save;
            resources.ApplyResources(this.buttonSave, "buttonSave");
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.ShowImage = true;
            this.buttonSave.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSave_Click);
            // 
            // buttonPreview
            // 
            resources.ApplyResources(this.buttonPreview, "buttonPreview");
            this.buttonPreview.Name = "buttonPreview";
            this.buttonPreview.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPreview_Click);
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.Word.Document";
            this.Tabs.Add(this.tabSageERPX3);
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
            this.tabSageERPX3.ResumeLayout(false);
            this.tabSageERPX3.PerformLayout();
            this.groupServer.ResumeLayout(false);
            this.groupServer.PerformLayout();
            this.groupMailMerge.ResumeLayout(false);
            this.groupMailMerge.PerformLayout();
            this.groupSave.ResumeLayout(false);
            this.groupSave.PerformLayout();
            this.groupReporting.ResumeLayout(false);
            this.groupReporting.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupServer;
        internal Microsoft.Office.Tools.Ribbon.RibbonSplitButton buttonConnect;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonServerSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupMailMerge;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonCreateMailMerge;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupReporting;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
