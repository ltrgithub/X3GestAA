namespace PowerPointAddIn
{
    partial class PresentationSelectionDialog
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

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

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(PresentationSelectionDialog));
            this.listWindows = new System.Windows.Forms.ListBox();
            this.buttonOk = new System.Windows.Forms.Button();
            this.buttonCancel = new System.Windows.Forms.Button();
            this.radioButtonFirst = new System.Windows.Forms.RadioButton();
            this.radioButtonAfterCurrent = new System.Windows.Forms.RadioButton();
            this.radioButtonLast = new System.Windows.Forms.RadioButton();
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.groupBox2 = new System.Windows.Forms.GroupBox();
            this.groupBox1.SuspendLayout();
            this.groupBox2.SuspendLayout();
            this.SuspendLayout();
            // 
            // listWindows
            // 
            this.listWindows.FormattingEnabled = true;
            resources.ApplyResources(this.listWindows, "listWindows");
            this.listWindows.Name = "listWindows";
            this.listWindows.SelectedIndexChanged += new System.EventHandler(this.listWindows_SelectedIndexChanged);
            this.listWindows.DoubleClick += new System.EventHandler(this.listWindows_DoubleClick);
            // 
            // buttonOk
            // 
            this.buttonOk.DialogResult = System.Windows.Forms.DialogResult.OK;
            resources.ApplyResources(this.buttonOk, "buttonOk");
            this.buttonOk.Name = "buttonOk";
            this.buttonOk.UseVisualStyleBackColor = true;
            this.buttonOk.Click += new System.EventHandler(this.buttonOk_Click);
            // 
            // buttonCancel
            // 
            this.buttonCancel.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            resources.ApplyResources(this.buttonCancel, "buttonCancel");
            this.buttonCancel.Name = "buttonCancel";
            this.buttonCancel.UseVisualStyleBackColor = true;
            this.buttonCancel.Click += new System.EventHandler(this.buttonCancel_Click);
            // 
            // radioButtonFirst
            // 
            resources.ApplyResources(this.radioButtonFirst, "radioButtonFirst");
            this.radioButtonFirst.Name = "radioButtonFirst";
            this.radioButtonFirst.UseVisualStyleBackColor = true;
            // 
            // radioButtonAfterCurrent
            // 
            resources.ApplyResources(this.radioButtonAfterCurrent, "radioButtonAfterCurrent");
            this.radioButtonAfterCurrent.Checked = true;
            this.radioButtonAfterCurrent.Name = "radioButtonAfterCurrent";
            this.radioButtonAfterCurrent.TabStop = true;
            this.radioButtonAfterCurrent.UseVisualStyleBackColor = true;
            // 
            // radioButtonLast
            // 
            resources.ApplyResources(this.radioButtonLast, "radioButtonLast");
            this.radioButtonLast.Name = "radioButtonLast";
            this.radioButtonLast.UseVisualStyleBackColor = true;
            // 
            // groupBox1
            // 
            this.groupBox1.Controls.Add(this.listWindows);
            resources.ApplyResources(this.groupBox1, "groupBox1");
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.TabStop = false;
            // 
            // groupBox2
            // 
            this.groupBox2.Controls.Add(this.radioButtonLast);
            this.groupBox2.Controls.Add(this.radioButtonAfterCurrent);
            this.groupBox2.Controls.Add(this.radioButtonFirst);
            resources.ApplyResources(this.groupBox2, "groupBox2");
            this.groupBox2.Name = "groupBox2";
            this.groupBox2.TabStop = false;
            // 
            // PresentationSelectionDialog
            // 
            resources.ApplyResources(this, "$this");
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.Controls.Add(this.groupBox2);
            this.Controls.Add(this.groupBox1);
            this.Controls.Add(this.buttonOk);
            this.Controls.Add(this.buttonCancel);
            this.Name = "PresentationSelectionDialog";
            this.Load += new System.EventHandler(this.PresentationSelectionDialog_Load);
            this.groupBox1.ResumeLayout(false);
            this.groupBox2.ResumeLayout(false);
            this.groupBox2.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.ListBox listWindows;
        private System.Windows.Forms.Button buttonOk;
        private System.Windows.Forms.Button buttonCancel;
        private System.Windows.Forms.RadioButton radioButtonFirst;
        private System.Windows.Forms.RadioButton radioButtonAfterCurrent;
        private System.Windows.Forms.RadioButton radioButtonLast;
        private System.Windows.Forms.GroupBox groupBox1;
        private System.Windows.Forms.GroupBox groupBox2;
    }
}