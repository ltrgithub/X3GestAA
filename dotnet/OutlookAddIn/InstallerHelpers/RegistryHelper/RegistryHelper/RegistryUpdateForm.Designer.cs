namespace RegistryHelper
{
    partial class UpdateRegistryForm
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
            this.components = new System.ComponentModel.Container();
            this.registryUpdateLabel = new System.Windows.Forms.Label();
            this.waitTimer = new System.Windows.Forms.Timer(this.components);
            this.SuspendLayout();
            // 
            // registryUpdateLabel
            // 
            this.registryUpdateLabel.AutoSize = true;
            this.registryUpdateLabel.Location = new System.Drawing.Point(41, 48);
            this.registryUpdateLabel.Name = "registryUpdateLabel";
            this.registryUpdateLabel.Size = new System.Drawing.Size(207, 17);
            this.registryUpdateLabel.TabIndex = 0;
            this.registryUpdateLabel.Text = "Updating registry. Please wait...";
            // 
            // waitTimer
            // 
            this.waitTimer.Interval = 2000;
            this.waitTimer.Tick += new System.EventHandler(this.waitTimer_Tick);
            // 
            // UpdateRegistryForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 16F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(583, 126);
            this.Controls.Add(this.registryUpdateLabel);
            this.Name = "UpdateRegistryForm";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "Updating registry";
            this.TopMost = true;
            this.Load += new System.EventHandler(this.UpdateRegistryForm_Load);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Label registryUpdateLabel;
        private System.Windows.Forms.Timer waitTimer;
    }
}

