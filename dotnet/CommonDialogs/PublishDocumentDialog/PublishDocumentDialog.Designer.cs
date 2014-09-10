namespace CommonDialogs.PublishDocumentDialog
{
    partial class PublishDocumentDialog
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
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(PublishDocumentDialog));
            this.groupBoxDescription = new System.Windows.Forms.GroupBox();
            this.comboBoxOwner = new System.Windows.Forms.ComboBox();
            this.comboBoxStorageVolume = new System.Windows.Forms.ComboBox();
            this.checkBoxReadOnly = new System.Windows.Forms.CheckBox();
            this.labelOwner = new System.Windows.Forms.Label();
            this.labelStorageVolume = new System.Windows.Forms.Label();
            this.textBoxDescription = new System.Windows.Forms.TextBox();
            this.labelDescription = new System.Windows.Forms.Label();
            this.btnCancel = new System.Windows.Forms.Button();
            this.btnOk = new System.Windows.Forms.Button();
            this.groupBoxTagsAndTeams = new System.Windows.Forms.GroupBox();
            this.checkedListBoxTeams = new System.Windows.Forms.CheckedListBox();
            this.checkedListBoxTags = new System.Windows.Forms.CheckedListBox();
            this.labelTeams = new System.Windows.Forms.Label();
            this.labelTags = new System.Windows.Forms.Label();
            this.groupBoxDescription.SuspendLayout();
            this.groupBoxTagsAndTeams.SuspendLayout();
            this.SuspendLayout();
            // 
            // groupBoxDescription
            // 
            this.groupBoxDescription.Controls.Add(this.comboBoxOwner);
            this.groupBoxDescription.Controls.Add(this.comboBoxStorageVolume);
            this.groupBoxDescription.Controls.Add(this.checkBoxReadOnly);
            this.groupBoxDescription.Controls.Add(this.labelOwner);
            this.groupBoxDescription.Controls.Add(this.labelStorageVolume);
            this.groupBoxDescription.Controls.Add(this.textBoxDescription);
            this.groupBoxDescription.Controls.Add(this.labelDescription);
            resources.ApplyResources(this.groupBoxDescription, "groupBoxDescription");
            this.groupBoxDescription.Name = "groupBoxDescription";
            this.groupBoxDescription.TabStop = false;
            // 
            // comboBoxOwner
            // 
            this.comboBoxOwner.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxOwner.FormattingEnabled = true;
            resources.ApplyResources(this.comboBoxOwner, "comboBoxOwner");
            this.comboBoxOwner.Name = "comboBoxOwner";
            // 
            // comboBoxStorageVolume
            // 
            this.comboBoxStorageVolume.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxStorageVolume.FormattingEnabled = true;
            resources.ApplyResources(this.comboBoxStorageVolume, "comboBoxStorageVolume");
            this.comboBoxStorageVolume.Name = "comboBoxStorageVolume";
            // 
            // checkBoxReadOnly
            // 
            resources.ApplyResources(this.checkBoxReadOnly, "checkBoxReadOnly");
            this.checkBoxReadOnly.Name = "checkBoxReadOnly";
            this.checkBoxReadOnly.UseVisualStyleBackColor = true;
            // 
            // labelOwner
            // 
            resources.ApplyResources(this.labelOwner, "labelOwner");
            this.labelOwner.Name = "labelOwner";
            // 
            // labelStorageVolume
            // 
            resources.ApplyResources(this.labelStorageVolume, "labelStorageVolume");
            this.labelStorageVolume.Name = "labelStorageVolume";
            // 
            // textBoxDescription
            // 
            resources.ApplyResources(this.textBoxDescription, "textBoxDescription");
            this.textBoxDescription.Name = "textBoxDescription";
            this.textBoxDescription.TextChanged += new System.EventHandler(this.textBoxDescription_TextChanged);
            // 
            // labelDescription
            // 
            resources.ApplyResources(this.labelDescription, "labelDescription");
            this.labelDescription.Name = "labelDescription";
            // 
            // btnCancel
            // 
            this.btnCancel.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            resources.ApplyResources(this.btnCancel, "btnCancel");
            this.btnCancel.Name = "btnCancel";
            this.btnCancel.UseVisualStyleBackColor = true;
            // 
            // btnOk
            // 
            this.btnOk.DialogResult = System.Windows.Forms.DialogResult.OK;
            resources.ApplyResources(this.btnOk, "btnOk");
            this.btnOk.Name = "btnOk";
            this.btnOk.UseVisualStyleBackColor = true;
            this.btnOk.Click += new System.EventHandler(this.btnOk_Click);
            // 
            // groupBoxTagsAndTeams
            // 
            this.groupBoxTagsAndTeams.Controls.Add(this.checkedListBoxTeams);
            this.groupBoxTagsAndTeams.Controls.Add(this.checkedListBoxTags);
            this.groupBoxTagsAndTeams.Controls.Add(this.labelTeams);
            this.groupBoxTagsAndTeams.Controls.Add(this.labelTags);
            resources.ApplyResources(this.groupBoxTagsAndTeams, "groupBoxTagsAndTeams");
            this.groupBoxTagsAndTeams.Name = "groupBoxTagsAndTeams";
            this.groupBoxTagsAndTeams.TabStop = false;
            // 
            // checkedListBoxTeams
            // 
            this.checkedListBoxTeams.FormattingEnabled = true;
            resources.ApplyResources(this.checkedListBoxTeams, "checkedListBoxTeams");
            this.checkedListBoxTeams.Name = "checkedListBoxTeams";
            // 
            // checkedListBoxTags
            // 
            this.checkedListBoxTags.FormattingEnabled = true;
            resources.ApplyResources(this.checkedListBoxTags, "checkedListBoxTags");
            this.checkedListBoxTags.Name = "checkedListBoxTags";
            // 
            // labelTeams
            // 
            resources.ApplyResources(this.labelTeams, "labelTeams");
            this.labelTeams.Name = "labelTeams";
            this.labelTeams.Click += new System.EventHandler(this.labelTeams_Click);
            // 
            // labelTags
            // 
            resources.ApplyResources(this.labelTags, "labelTags");
            this.labelTags.Name = "labelTags";
            // 
            // PublishDocumentDialog
            // 
            this.AcceptButton = this.btnOk;
            resources.ApplyResources(this, "$this");
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.Controls.Add(this.groupBoxTagsAndTeams);
            this.Controls.Add(this.btnCancel);
            this.Controls.Add(this.btnOk);
            this.Controls.Add(this.groupBoxDescription);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "PublishDocumentDialog";
            this.groupBoxDescription.ResumeLayout(false);
            this.groupBoxDescription.PerformLayout();
            this.groupBoxTagsAndTeams.ResumeLayout(false);
            this.groupBoxTagsAndTeams.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.GroupBox groupBoxDescription;
        private System.Windows.Forms.ComboBox comboBoxOwner;
        private System.Windows.Forms.ComboBox comboBoxStorageVolume;
        private System.Windows.Forms.CheckBox checkBoxReadOnly;
        private System.Windows.Forms.Label labelOwner;
        private System.Windows.Forms.Label labelStorageVolume;
        private System.Windows.Forms.TextBox textBoxDescription;
        private System.Windows.Forms.Label labelDescription;
        private System.Windows.Forms.Button btnCancel;
        private System.Windows.Forms.Button btnOk;
        private System.Windows.Forms.GroupBox groupBoxTagsAndTeams;
        private System.Windows.Forms.Label labelTags;
        private System.Windows.Forms.Label labelTeams;
        private System.Windows.Forms.CheckedListBox checkedListBoxTeams;
        private System.Windows.Forms.CheckedListBox checkedListBoxTags;
    }
}