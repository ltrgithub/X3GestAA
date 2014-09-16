using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using CommonDialogs.PublishDocumentTemplateDialog;

namespace CommonDialogs.PublishDocumentTemplateDialog
{
    public partial class PublishDocumentTemplateDialog : Form, IPublishDocumentTemplateDialog
    {
        public PublishDocumentTemplateDialog()
        {
            InitializeComponent();
        }

        public string Code
        {
            get { return textBoxCode.Text; }
            set { textBoxCode.Text = value; }
        }

        public string Description
        {
            get { return textBoxDescription.Text; }
            set { textBoxDescription.Text = value; }
        }

        public new string Owner
        {
            get { return comboBoxOwner.SelectedValue.ToString(); }
            set { comboBoxOwner.Text = value; }
        }

        public string Purpose
        {
            get { return comboBoxPurpose.Text; }
            set { comboBoxPurpose.Text = value; }
        }

        public string Endpoint
        {
            get { return comboBoxEndpoint.SelectedValue.ToString(); }
            set { comboBoxEndpoint.Text = value; }
        }

        public string Company
        {
            get 
            {
                if (comboBoxCompany.Items.Count > 0)
                {
                    return comboBoxCompany.SelectedValue.ToString();
                }
                else
                {
                    return "";
                }
            }
            set { comboBoxCompany.Text = value; }
        }

        public string Legislation
        {
            get 
            {
                if (comboBoxLegislation.Items.Count > 0)
                {
                    return comboBoxLegislation.SelectedValue.ToString();
                }
                else
                {
                    return "";
                }
            }
            set { comboBoxLegislation.Text = value; }
        }

        public string ActivityCode
        {
            get 
            {
                if (comboBoxActivityCode.Items.Count > 0)
                {
                    return comboBoxActivityCode.SelectedValue.ToString();
                }
                else
                {
                    return "";
                }
            }
            set { comboBoxActivityCode.Text = value; }
        }

        public new CheckedListBox.CheckedItemCollection Tag
        {
            get { return checkedListBoxTags.CheckedItems; }
        }

        public CheckedListBox.CheckedItemCollection Team
        {
            get { return checkedListBoxTeams.CheckedItems; }
        }
        
        public object OwnerList
        {
            get { return null; }
            set {
                comboBoxOwner.DataSource = value;
                comboBoxOwner.DisplayMember = "Login";
                comboBoxOwner.ValueMember = "Uuid";
            }
        }

        public object PurposeList
        {
            get { return null; }
            set
            {
                comboBoxPurpose.DataSource = value;
                comboBoxPurpose.DisplayMember = "Name";
                comboBoxPurpose.ValueMember = "Uuid";
            }
        }

        public object EndpointList
        {
            get { return null; }
            set
            {
                comboBoxEndpoint.DataSource = value;
                comboBoxEndpoint.DisplayMember = "Description";
                comboBoxEndpoint.ValueMember = "Uuid";
            }
        }

        public object CompanyList
        {
            get { return null; }
            set
            {
                comboBoxCompany.DataSource = value;
                comboBoxCompany.DisplayMember = "Cpynam";
                comboBoxCompany.ValueMember = "Cpy";
            }
        }

        public object LegislationList
        {
            get { return ""; }
            set
            {
                comboBoxLegislation.DataSource = value;
                comboBoxLegislation.DisplayMember = "Description";
                comboBoxLegislation.ValueMember = "Code";
            }
        }

        public object ActivityCodeList
        {
            get { return null; }
            set
            {
                comboBoxActivityCode.DataSource = value;
                comboBoxActivityCode.DisplayMember = "Description";
                comboBoxActivityCode.ValueMember = "Codeact";
            }
        }

        public object TagList
        {
            get { return null; }
            set
            {
                checkedListBoxTags.DataSource = value;
                checkedListBoxTags.DisplayMember = "Description";
                checkedListBoxTags.ValueMember = "TagJson";
            }
        }

        public object TeamList
        {
            get { return null; }
            set
            {
                checkedListBoxTeams.DataSource = value;
                checkedListBoxTeams.DisplayMember = "Description";
                checkedListBoxTeams.ValueMember = "TeamJson";
            }
        }

        private string _documentType = string.Empty;
        public string DocumentType
        {
            get { return _documentType; }
            set { _documentType = value; }
        }

        private void btnOk_Click(object sender, EventArgs e)
        {
            _publisherDelegate(this, _workingCopyPrototypeModel, _customData);
        }

        private void comboBoxEndpoint_SelectedIndexChanged(object sender, EventArgs e)
        {
            bool isEndpointSelected = comboBoxEndpoint.SelectedIndex != 0;

            comboBoxCompany.Enabled = isEndpointSelected;
            comboBoxLegislation.Enabled = isEndpointSelected;
            comboBoxActivityCode.Enabled = isEndpointSelected;

            /*
             * Call the endpoint delegate to signal that the endpoint has been changed.
             */
            ActivityCodeList = null;
            CompanyList = null;
            LegislationList = null;

            ActivityCode = string.Empty;
            Company = string.Empty;
            Legislation = string.Empty;

            if (comboBoxEndpoint.SelectedIndex != 0)
            {
                _endpointDelegate(_officeApplication, _savePrototypeName, comboBoxEndpoint.SelectedValue.ToString(), _customData, this);
            }
        }

        private string _errorCodeText = string.Empty;
        private void textBoxCode_TextChanged(object sender, EventArgs e)
        {
            if (textBoxCode.Text.Length > 0 && (textBoxCode.Text.Equals(_errorCodeText) == true || !_dialogCheckerDelegate("code", _workingCopyPrototypeModel, this)))
            {
                textBoxCode.BackColor = Color.Red;
                _errorCodeText = textBoxCode.Text;
            }
            else
            {
                textBoxCode.BackColor = SystemColors.Window;
                _errorCodeText = string.Empty;
            }
            btnOk_enable();
        }

        private string _errorDescriptionText = string.Empty;
        private void textBoxDescription_TextChanged(object sender, EventArgs e)
        {
            if (textBoxDescription.Text.Length > 0 && (textBoxDescription.Text.Equals(_errorDescriptionText) == true || !_dialogCheckerDelegate("description", _workingCopyPrototypeModel, this)))
            {
                textBoxDescription.BackColor = Color.Red;
                _errorDescriptionText = textBoxDescription.Text;
            }
            else
            {
                textBoxDescription.BackColor = SystemColors.Window;
                _errorDescriptionText = string.Empty;
            }
            btnOk_enable();
        }

        private void btnOk_enable()
        {
            btnOk.Enabled = (!string.IsNullOrEmpty(textBoxDescription.Text) && !string.IsNullOrEmpty(textBoxCode.Text) && _errorCodeText.Length == 0 && _errorDescriptionText.Length == 0);
        }

        PublisherDocumentTemplateDelegate _publisherDelegate = null;
        private object _workingCopyPrototypeModel = null;
        private object _customData = null;
        public void Publisher(PublisherDocumentTemplateDelegate publisherDelegate, object workingCopyPrototypeModel, object customData)
        {
            _publisherDelegate = publisherDelegate;
            _workingCopyPrototypeModel = workingCopyPrototypeModel;
            _customData = customData;
        }

        private string _officeApplication = string.Empty;
        private string _savePrototypeName = string.Empty;
        private EndpointDelegate _endpointDelegate = null;
        public void setEndpointDelegate(EndpointDelegate endpointDelegate, string officeApplication, string savePrototypeName)
        {
            _endpointDelegate = endpointDelegate;
            _officeApplication = officeApplication;
            _savePrototypeName = savePrototypeName;
        }

        private DialogCheckerDelegate _dialogCheckerDelegate = null;
        public void setDialogCheckerDelegate(DialogCheckerDelegate dialogCheckerDelegate)
        {
            _dialogCheckerDelegate = dialogCheckerDelegate;
        }
    }
}
