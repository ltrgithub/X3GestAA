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
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItemImpl1 = this.Factory.CreateRibbonDropDownItem();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Ribbon));
            this.tabSageERPX3 = this.Factory.CreateRibbonTab();
            this.groupSave = this.Factory.CreateRibbonGroup();
            this.groupReporting = this.Factory.CreateRibbonGroup();
            this.checkBoxShowTemplatePane = this.Factory.CreateRibbonCheckBox();
            this.groupLocale = this.Factory.CreateRibbonGroup();
            this.dropDownLocale = this.Factory.CreateRibbonDropDown();
            this.buttonSave = this.Factory.CreateRibbonButton();
            this.buttonSaveAs = this.Factory.CreateRibbonButton();
            this.buttonRefreshReport = this.Factory.CreateRibbonButton();
            this.buttonPreview = this.Factory.CreateRibbonButton();
            this.tabSageERPX3.SuspendLayout();
            this.groupSave.SuspendLayout();
            this.groupReporting.SuspendLayout();
            this.groupLocale.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.groupSave);
            this.tabSageERPX3.Groups.Add(this.groupReporting);
            this.tabSageERPX3.Groups.Add(this.groupLocale);
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
            // groupReporting
            // 
            this.groupReporting.Items.Add(this.buttonRefreshReport);
            this.groupReporting.Items.Add(this.buttonPreview);
            this.groupReporting.Items.Add(this.checkBoxShowTemplatePane);
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
            resources.ApplyResources(ribbonDropDownItemImpl1, "ribbonDropDownItemImpl1");
            this.dropDownLocale.Items.Add(ribbonDropDownItemImpl1);
            resources.ApplyResources(this.dropDownLocale, "dropDownLocale");
            this.dropDownLocale.Name = "dropDownLocale";
            this.dropDownLocale.SelectionChanged += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.dropDownLocale_SelectionChanged);
            // 
            // buttonSave
            // 
            this.buttonSave.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSave.Image = global::WordAddIn.Properties.Resources.sauvegarder;
            resources.ApplyResources(this.buttonSave, "buttonSave");
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.ShowImage = true;
            this.buttonSave.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSave_Click);
            // 
            // buttonSaveAs
            // 
            this.buttonSaveAs.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSaveAs.Image = global::WordAddIn.Properties.Resources.sauvegarder2;
            resources.ApplyResources(this.buttonSaveAs, "buttonSaveAs");
            this.buttonSaveAs.Name = "buttonSaveAs";
            this.buttonSaveAs.ShowImage = true;
            this.buttonSaveAs.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSaveAs_Click);
            // 
            // buttonRefreshReport
            // 
            this.buttonRefreshReport.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonRefreshReport.Image = global::WordAddIn.Properties.Resources.refresh;
            resources.ApplyResources(this.buttonRefreshReport, "buttonRefreshReport");
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
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.Word.Document";
            this.Tabs.Add(this.tabSageERPX3);
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
            this.tabSageERPX3.ResumeLayout(false);
            this.tabSageERPX3.PerformLayout();
            this.groupSave.ResumeLayout(false);
            this.groupSave.PerformLayout();
            this.groupReporting.ResumeLayout(false);
            this.groupReporting.PerformLayout();
            this.groupLocale.ResumeLayout(false);
            this.groupLocale.PerformLayout();

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSave;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupReporting;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPreview;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBoxShowTemplatePane;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSaveAs;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshReport;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupLocale;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownLocale;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
