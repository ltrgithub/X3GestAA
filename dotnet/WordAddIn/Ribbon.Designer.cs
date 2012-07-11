namespace WordAddIn
{
    partial class Ribbon : Microsoft.Office.Tools.Ribbon.OfficeRibbon
    {
        /// <summary>
        /// Erforderliche Designervariable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        public Ribbon()
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
            this.tabSageERPX3 = new Microsoft.Office.Tools.Ribbon.RibbonTab();
            this.group1 = new Microsoft.Office.Tools.Ribbon.RibbonGroup();
            this.tabSageERPX3.SuspendLayout();
            this.SuspendLayout();
            // 
            // tabSageERPX3
            // 
            this.tabSageERPX3.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.tabSageERPX3.Groups.Add(this.group1);
            this.tabSageERPX3.Label = "Sage ERP X3";
            this.tabSageERPX3.Name = "tabSageERPX3";
            // 
            // group1
            // 
            this.group1.Label = "group1";
            this.group1.Name = "group1";
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.Word.Document";
            this.Tabs.Add(this.tabSageERPX3);
            this.Load += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonUIEventArgs>(this.Ribbon_Load);
            this.tabSageERPX3.ResumeLayout(false);
            this.tabSageERPX3.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab tabSageERPX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group1;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
