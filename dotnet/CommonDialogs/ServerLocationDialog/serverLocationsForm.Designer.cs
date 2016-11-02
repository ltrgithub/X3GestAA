namespace CommonDialogs.ServerLocationDialog
{
    partial class serverLocationsDialog
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
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(serverLocationsDialog));
            this.upButton = new System.Windows.Forms.Button();
            this.okButton = new System.Windows.Forms.Button();
            this.cancelButton = new System.Windows.Forms.Button();
            this.removeButton = new System.Windows.Forms.Button();
            this.downButton = new System.Windows.Forms.Button();
            this.serverLocationsListBox = new System.Windows.Forms.ListBox();
            this.SuspendLayout();
            // 
            // upButton
            // 
            resources.ApplyResources(this.upButton, "upButton");
            this.upButton.Image = global::CommonDialogs.Properties.Resources.arrow_up;
            this.upButton.Name = "upButton";
            this.upButton.UseVisualStyleBackColor = true;
            this.upButton.Click += new System.EventHandler(this.upButton_Click);
            // 
            // okButton
            // 
            resources.ApplyResources(this.okButton, "okButton");
            this.okButton.Name = "okButton";
            this.okButton.UseVisualStyleBackColor = true;
            this.okButton.Click += new System.EventHandler(this.okButton_Click);
            // 
            // cancelButton
            // 
            resources.ApplyResources(this.cancelButton, "cancelButton");
            this.cancelButton.Name = "cancelButton";
            this.cancelButton.UseVisualStyleBackColor = true;
            this.cancelButton.Click += new System.EventHandler(this.cancelButton_Click);
            // 
            // removeButton
            // 
            resources.ApplyResources(this.removeButton, "removeButton");
            this.removeButton.Name = "removeButton";
            this.removeButton.UseVisualStyleBackColor = true;
            this.removeButton.Click += new System.EventHandler(this.removeButton_Click);
            // 
            // downButton
            // 
            resources.ApplyResources(this.downButton, "downButton");
            this.downButton.Image = global::CommonDialogs.Properties.Resources.arrow_down;
            this.downButton.Name = "downButton";
            this.downButton.UseVisualStyleBackColor = true;
            this.downButton.Click += new System.EventHandler(this.downButton_Click);
            // 
            // serverLocationsListBox
            // 
            resources.ApplyResources(this.serverLocationsListBox, "serverLocationsListBox");
            this.serverLocationsListBox.FormattingEnabled = true;
            this.serverLocationsListBox.Name = "serverLocationsListBox";
            this.serverLocationsListBox.SelectedIndexChanged += new System.EventHandler(this.serverLocationsListBox_SelectedIndexChanged);
            this.serverLocationsListBox.KeyDown += new System.Windows.Forms.KeyEventHandler(this.serverLocationsListBox_KeyDown);
            // 
            // serverLocationsDialog
            // 
            resources.ApplyResources(this, "$this");
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.None;
            this.Controls.Add(this.serverLocationsListBox);
            this.Controls.Add(this.downButton);
            this.Controls.Add(this.removeButton);
            this.Controls.Add(this.cancelButton);
            this.Controls.Add(this.okButton);
            this.Controls.Add(this.upButton);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "serverLocationsDialog";
            this.Load += new System.EventHandler(this.serverLocationsForm_Load);
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.Button upButton;
        private System.Windows.Forms.Button okButton;
        private System.Windows.Forms.Button cancelButton;
        private System.Windows.Forms.Button removeButton;
        private System.Windows.Forms.Button downButton;
        private System.Windows.Forms.ListBox serverLocationsListBox;
    }
}