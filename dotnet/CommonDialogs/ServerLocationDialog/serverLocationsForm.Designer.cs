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
            this.upButton.Image = global::CommonDialogs.Properties.Resources.arrow_up;
            this.upButton.Location = new System.Drawing.Point(526, 22);
            this.upButton.Name = "upButton";
            this.upButton.Size = new System.Drawing.Size(75, 23);
            this.upButton.TabIndex = 0;
            this.upButton.UseVisualStyleBackColor = true;
            this.upButton.Click += new System.EventHandler(this.upButton_Click);
            // 
            // okButton
            // 
            this.okButton.Location = new System.Drawing.Point(440, 273);
            this.okButton.Name = "okButton";
            this.okButton.Size = new System.Drawing.Size(75, 30);
            this.okButton.TabIndex = 1;
            this.okButton.Text = "OK";
            this.okButton.UseVisualStyleBackColor = true;
            this.okButton.Click += new System.EventHandler(this.okButton_Click);
            // 
            // cancelButton
            // 
            this.cancelButton.Location = new System.Drawing.Point(526, 273);
            this.cancelButton.Name = "cancelButton";
            this.cancelButton.Size = new System.Drawing.Size(75, 30);
            this.cancelButton.TabIndex = 2;
            this.cancelButton.Text = "Cancel";
            this.cancelButton.UseVisualStyleBackColor = true;
            this.cancelButton.Click += new System.EventHandler(this.cancelButton_Click);
            // 
            // removeButton
            // 
            this.removeButton.Location = new System.Drawing.Point(526, 80);
            this.removeButton.Name = "removeButton";
            this.removeButton.Size = new System.Drawing.Size(75, 26);
            this.removeButton.TabIndex = 3;
            this.removeButton.Text = "Remove";
            this.removeButton.UseVisualStyleBackColor = true;
            this.removeButton.Click += new System.EventHandler(this.removeButton_Click);
            // 
            // downButton
            // 
            this.downButton.Image = global::CommonDialogs.Properties.Resources.arrow_down;
            this.downButton.Location = new System.Drawing.Point(526, 51);
            this.downButton.Name = "downButton";
            this.downButton.Size = new System.Drawing.Size(75, 23);
            this.downButton.TabIndex = 4;
            this.downButton.UseVisualStyleBackColor = true;
            this.downButton.Click += new System.EventHandler(this.downButton_Click);
            // 
            // serverLocationsListBox
            // 
            this.serverLocationsListBox.FormattingEnabled = true;
            this.serverLocationsListBox.ItemHeight = 16;
            this.serverLocationsListBox.Location = new System.Drawing.Point(7, 6);
            this.serverLocationsListBox.Name = "serverLocationsListBox";
            this.serverLocationsListBox.Size = new System.Drawing.Size(509, 260);
            this.serverLocationsListBox.TabIndex = 5;
            this.serverLocationsListBox.SelectedIndexChanged += new System.EventHandler(this.serverLocationsListBox_SelectedIndexChanged);
            this.serverLocationsListBox.KeyDown += new System.Windows.Forms.KeyEventHandler(this.serverLocationsListBox_KeyDown);
            // 
            // serverLocationsDialog
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 16F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(612, 310);
            this.ControlBox = false;
            this.Controls.Add(this.serverLocationsListBox);
            this.Controls.Add(this.downButton);
            this.Controls.Add(this.removeButton);
            this.Controls.Add(this.cancelButton);
            this.Controls.Add(this.okButton);
            this.Controls.Add(this.upButton);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.Name = "serverLocationsDialog";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Server locations";
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