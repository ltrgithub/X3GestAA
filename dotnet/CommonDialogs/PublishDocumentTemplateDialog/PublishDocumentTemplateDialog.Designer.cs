﻿namespace CommonDialogs.PublishDocumentTemplateDialog
{
    partial class PublishDocumentTemplateDialog
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
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(PublishDocumentTemplateDialog));
            this.groupBoxDescription = new System.Windows.Forms.GroupBox();
            this.textBoxDescription = new CustomComponents.RichTextBox();
            this.labelDescriptionErrorText = new System.Windows.Forms.Label();
            this.labelCodeErrorText = new System.Windows.Forms.Label();
            this.textBoxCode = new CustomComponents.RichTextBox();
            this.labelCode = new System.Windows.Forms.Label();
            this.comboBoxOwner = new System.Windows.Forms.ComboBox();
            this.checkBoxReadOnly = new System.Windows.Forms.CheckBox();
            this.labelOwner = new System.Windows.Forms.Label();
            this.labelDescription = new System.Windows.Forms.Label();
            this.btnCancel = new System.Windows.Forms.Button();
            this.btnOk = new System.Windows.Forms.Button();
            this.groupBoxTagsAndTeams = new System.Windows.Forms.GroupBox();
            this.checkedListBoxTeams = new System.Windows.Forms.CheckedListBox();
            this.checkedListBoxTags = new System.Windows.Forms.CheckedListBox();
            this.labelTeams = new System.Windows.Forms.Label();
            this.labelTags = new System.Windows.Forms.Label();
            this.groupBoxRelatedTo = new System.Windows.Forms.GroupBox();
            this.labelActivityCode = new System.Windows.Forms.Label();
            this.labelLegislation = new System.Windows.Forms.Label();
            this.labelCompany = new System.Windows.Forms.Label();
            this.comboBoxActivityCode = new System.Windows.Forms.ComboBox();
            this.comboBoxLegislation = new System.Windows.Forms.ComboBox();
            this.comboBoxCompany = new System.Windows.Forms.ComboBox();
            this.label1 = new System.Windows.Forms.Label();
            this.comboBoxEndpoint = new System.Windows.Forms.ComboBox();
            this.labelPurpose = new System.Windows.Forms.Label();
            this.comboBoxPurpose = new System.Windows.Forms.ComboBox();
            this.groupBoxDescription.SuspendLayout();
            this.groupBoxTagsAndTeams.SuspendLayout();
            this.groupBoxRelatedTo.SuspendLayout();
            this.SuspendLayout();
            // 
            // groupBoxDescription
            // 
            resources.ApplyResources(this.groupBoxDescription, "groupBoxDescription");
            this.groupBoxDescription.Controls.Add(this.textBoxDescription);
            this.groupBoxDescription.Controls.Add(this.labelDescriptionErrorText);
            this.groupBoxDescription.Controls.Add(this.labelCodeErrorText);
            this.groupBoxDescription.Controls.Add(this.textBoxCode);
            this.groupBoxDescription.Controls.Add(this.labelCode);
            this.groupBoxDescription.Controls.Add(this.comboBoxOwner);
            this.groupBoxDescription.Controls.Add(this.checkBoxReadOnly);
            this.groupBoxDescription.Controls.Add(this.labelOwner);
            this.groupBoxDescription.Controls.Add(this.labelDescription);
            this.groupBoxDescription.Name = "groupBoxDescription";
            this.groupBoxDescription.TabStop = false;
            // 
            // textBoxDescription
            // 
            resources.ApplyResources(this.textBoxDescription, "textBoxDescription");
            this.textBoxDescription.Name = "textBoxDescription";
            this.textBoxDescription.ShowError = false;
            this.textBoxDescription.TextChanged += new System.EventHandler(this.textBoxDescription_TextChanged);
            // 
            // labelDescriptionErrorText
            // 
            resources.ApplyResources(this.labelDescriptionErrorText, "labelDescriptionErrorText");
            this.labelDescriptionErrorText.ForeColor = System.Drawing.Color.Red;
            this.labelDescriptionErrorText.Name = "labelDescriptionErrorText";
            this.labelDescriptionErrorText.Tag = "";
            // 
            // labelCodeErrorText
            // 
            resources.ApplyResources(this.labelCodeErrorText, "labelCodeErrorText");
            this.labelCodeErrorText.ForeColor = System.Drawing.Color.Red;
            this.labelCodeErrorText.Name = "labelCodeErrorText";
            this.labelCodeErrorText.Tag = "";
            // 
            // textBoxCode
            // 
            resources.ApplyResources(this.textBoxCode, "textBoxCode");
            this.textBoxCode.Name = "textBoxCode";
            this.textBoxCode.ShowError = false;
            this.textBoxCode.TextChanged += new System.EventHandler(this.textBoxCode_TextChanged);
            // 
            // labelCode
            // 
            resources.ApplyResources(this.labelCode, "labelCode");
            this.labelCode.Name = "labelCode";
            // 
            // comboBoxOwner
            // 
            resources.ApplyResources(this.comboBoxOwner, "comboBoxOwner");
            this.comboBoxOwner.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxOwner.FormattingEnabled = true;
            this.comboBoxOwner.Name = "comboBoxOwner";
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
            // labelDescription
            // 
            resources.ApplyResources(this.labelDescription, "labelDescription");
            this.labelDescription.Name = "labelDescription";
            // 
            // btnCancel
            // 
            resources.ApplyResources(this.btnCancel, "btnCancel");
            this.btnCancel.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            this.btnCancel.Name = "btnCancel";
            this.btnCancel.UseVisualStyleBackColor = true;
            // 
            // btnOk
            // 
            resources.ApplyResources(this.btnOk, "btnOk");
            this.btnOk.DialogResult = System.Windows.Forms.DialogResult.OK;
            this.btnOk.Name = "btnOk";
            this.btnOk.UseVisualStyleBackColor = true;
            this.btnOk.Click += new System.EventHandler(this.btnOk_Click);
            // 
            // groupBoxTagsAndTeams
            // 
            resources.ApplyResources(this.groupBoxTagsAndTeams, "groupBoxTagsAndTeams");
            this.groupBoxTagsAndTeams.Controls.Add(this.checkedListBoxTeams);
            this.groupBoxTagsAndTeams.Controls.Add(this.checkedListBoxTags);
            this.groupBoxTagsAndTeams.Controls.Add(this.labelTeams);
            this.groupBoxTagsAndTeams.Controls.Add(this.labelTags);
            this.groupBoxTagsAndTeams.Name = "groupBoxTagsAndTeams";
            this.groupBoxTagsAndTeams.TabStop = false;
            // 
            // checkedListBoxTeams
            // 
            resources.ApplyResources(this.checkedListBoxTeams, "checkedListBoxTeams");
            this.checkedListBoxTeams.FormattingEnabled = true;
            this.checkedListBoxTeams.Name = "checkedListBoxTeams";
            // 
            // checkedListBoxTags
            // 
            resources.ApplyResources(this.checkedListBoxTags, "checkedListBoxTags");
            this.checkedListBoxTags.FormattingEnabled = true;
            this.checkedListBoxTags.Name = "checkedListBoxTags";
            // 
            // labelTeams
            // 
            resources.ApplyResources(this.labelTeams, "labelTeams");
            this.labelTeams.Name = "labelTeams";
            // 
            // labelTags
            // 
            resources.ApplyResources(this.labelTags, "labelTags");
            this.labelTags.Name = "labelTags";
            // 
            // groupBoxRelatedTo
            // 
            resources.ApplyResources(this.groupBoxRelatedTo, "groupBoxRelatedTo");
            this.groupBoxRelatedTo.Controls.Add(this.labelActivityCode);
            this.groupBoxRelatedTo.Controls.Add(this.labelLegislation);
            this.groupBoxRelatedTo.Controls.Add(this.labelCompany);
            this.groupBoxRelatedTo.Controls.Add(this.comboBoxActivityCode);
            this.groupBoxRelatedTo.Controls.Add(this.comboBoxLegislation);
            this.groupBoxRelatedTo.Controls.Add(this.comboBoxCompany);
            this.groupBoxRelatedTo.Controls.Add(this.label1);
            this.groupBoxRelatedTo.Controls.Add(this.comboBoxEndpoint);
            this.groupBoxRelatedTo.Controls.Add(this.labelPurpose);
            this.groupBoxRelatedTo.Controls.Add(this.comboBoxPurpose);
            this.groupBoxRelatedTo.Name = "groupBoxRelatedTo";
            this.groupBoxRelatedTo.TabStop = false;
            this.groupBoxRelatedTo.Enter += new System.EventHandler(this.groupBoxRelatedTo_Enter);
            // 
            // labelActivityCode
            // 
            resources.ApplyResources(this.labelActivityCode, "labelActivityCode");
            this.labelActivityCode.Name = "labelActivityCode";
            // 
            // labelLegislation
            // 
            resources.ApplyResources(this.labelLegislation, "labelLegislation");
            this.labelLegislation.Name = "labelLegislation";
            // 
            // labelCompany
            // 
            resources.ApplyResources(this.labelCompany, "labelCompany");
            this.labelCompany.Name = "labelCompany";
            // 
            // comboBoxActivityCode
            // 
            resources.ApplyResources(this.comboBoxActivityCode, "comboBoxActivityCode");
            this.comboBoxActivityCode.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxActivityCode.FormattingEnabled = true;
            this.comboBoxActivityCode.Name = "comboBoxActivityCode";
            // 
            // comboBoxLegislation
            // 
            resources.ApplyResources(this.comboBoxLegislation, "comboBoxLegislation");
            this.comboBoxLegislation.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxLegislation.FormattingEnabled = true;
            this.comboBoxLegislation.Name = "comboBoxLegislation";
            // 
            // comboBoxCompany
            // 
            resources.ApplyResources(this.comboBoxCompany, "comboBoxCompany");
            this.comboBoxCompany.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxCompany.FormattingEnabled = true;
            this.comboBoxCompany.Name = "comboBoxCompany";
            // 
            // label1
            // 
            resources.ApplyResources(this.label1, "label1");
            this.label1.Name = "label1";
            // 
            // comboBoxEndpoint
            // 
            resources.ApplyResources(this.comboBoxEndpoint, "comboBoxEndpoint");
            this.comboBoxEndpoint.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboBoxEndpoint.FormattingEnabled = true;
            this.comboBoxEndpoint.Name = "comboBoxEndpoint";
            this.comboBoxEndpoint.SelectedIndexChanged += new System.EventHandler(this.comboBoxEndpoint_SelectedIndexChanged);
            // 
            // labelPurpose
            // 
            resources.ApplyResources(this.labelPurpose, "labelPurpose");
            this.labelPurpose.Name = "labelPurpose";
            // 
            // comboBoxPurpose
            // 
            resources.ApplyResources(this.comboBoxPurpose, "comboBoxPurpose");
            this.comboBoxPurpose.FormattingEnabled = true;
            this.comboBoxPurpose.Name = "comboBoxPurpose";
            // 
            // PublishDocumentTemplateDialog
            // 
            this.AcceptButton = this.btnOk;
            resources.ApplyResources(this, "$this");
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.Controls.Add(this.groupBoxRelatedTo);
            this.Controls.Add(this.groupBoxTagsAndTeams);
            this.Controls.Add(this.btnCancel);
            this.Controls.Add(this.btnOk);
            this.Controls.Add(this.groupBoxDescription);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "PublishDocumentTemplateDialog";
            this.groupBoxDescription.ResumeLayout(false);
            this.groupBoxDescription.PerformLayout();
            this.groupBoxTagsAndTeams.ResumeLayout(false);
            this.groupBoxTagsAndTeams.PerformLayout();
            this.groupBoxRelatedTo.ResumeLayout(false);
            this.groupBoxRelatedTo.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.GroupBox groupBoxDescription;
        private System.Windows.Forms.ComboBox comboBoxOwner;
        private System.Windows.Forms.CheckBox checkBoxReadOnly;
        private System.Windows.Forms.Label labelOwner;
        private System.Windows.Forms.Label labelDescription;
        private System.Windows.Forms.Button btnCancel;
        private System.Windows.Forms.Button btnOk;
        private System.Windows.Forms.GroupBox groupBoxTagsAndTeams;
        private System.Windows.Forms.Label labelTags;
        private System.Windows.Forms.Label labelTeams;
        private System.Windows.Forms.GroupBox groupBoxRelatedTo;
        private System.Windows.Forms.Label labelPurpose;
        private System.Windows.Forms.ComboBox comboBoxPurpose;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.ComboBox comboBoxEndpoint;
        private System.Windows.Forms.ComboBox comboBoxActivityCode;
        private System.Windows.Forms.ComboBox comboBoxLegislation;
        private System.Windows.Forms.ComboBox comboBoxCompany;
        private System.Windows.Forms.Label labelCompany;
        private System.Windows.Forms.Label labelActivityCode;
        private System.Windows.Forms.Label labelLegislation;
        private System.Windows.Forms.CheckedListBox checkedListBoxTags;
        private System.Windows.Forms.CheckedListBox checkedListBoxTeams;
        private System.Windows.Forms.Label labelCode;
        private CustomComponents.RichTextBox textBoxCode;
        private System.Windows.Forms.Label labelCodeErrorText;
        private System.Windows.Forms.Label labelDescriptionErrorText;
        private CustomComponents.RichTextBox textBoxDescription;
    }
}