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
            this.buttonConnect = this.Factory.CreateRibbonSplitButton();
            this.buttonServerSettings = this.Factory.CreateRibbonButton();
            this.groupMailMerge = this.Factory.CreateRibbonGroup();
            this.buttonCreateMailMerge = this.Factory.CreateRibbonButton();
            this.groupSave = this.Factory.CreateRibbonGroup();
            this.buttonSave = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupServer.SuspendLayout();
            this.groupMailMerge.SuspendLayout();
            this.groupSave.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupServer);
            this.tabSageERPX3.Groups.Add(this.groupMailMerge);
            this.tabSageERPX3.Groups.Add(this.groupSave);
            resources.ApplyResources(this.tabSageERPX3, "tabSageERPX3");
            this.tabSageERPX3.Name = "tabSageERPX3";
            // 
            // groupServer
            // 
            this.groupServer.Items.Add(this.buttonConnect);
            resources.ApplyResources(this.groupServer, "groupServer");
            this.groupServer.Name = "groupServer";
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
            // groupMailMerge
            // 
            this.groupMailMerge.Items.Add(this.buttonCreateMailMerge);
            resources.ApplyResources(this.groupMailMerge, "groupMailMerge");
            this.groupMailMerge.Name = "groupMailMerge";
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
            // groupSave
            // 
            this.groupSave.Items.Add(this.buttonSave);
            resources.ApplyResources(this.groupSave, "groupSave");
            this.groupSave.Name = "groupSave";
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
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
