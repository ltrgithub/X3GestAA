namespace ExcelAddIn
{
    partial class ExcelTemplatePane
    {
        /// <summary> 
        /// Erforderliche Designervariable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

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
            this.treeViewFields = new System.Windows.Forms.TreeView();
            this.SuspendLayout();
            // 
            // treeViewFields
            // 
            this.treeViewFields.AccessibleRole = System.Windows.Forms.AccessibleRole.Indicator;
            this.treeViewFields.Location = new System.Drawing.Point(3, 3);
            this.treeViewFields.Name = "treeViewFields";
            this.treeViewFields.Size = new System.Drawing.Size(144, 69);
            this.treeViewFields.TabIndex = 0;
            // 
            // SyracuseTemplatePane
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.Controls.Add(this.treeViewFields);
            this.Name = "SyracuseTemplatePane";
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.TreeView treeViewFields;

    }
}
