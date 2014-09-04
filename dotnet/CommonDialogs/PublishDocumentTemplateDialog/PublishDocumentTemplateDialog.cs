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
            get { return comboBoxPurpose.SelectedValue.ToString(); }
            set { comboBoxPurpose.Text = value; }
        }

        public string Endpoint
        {
            get { return comboBoxEndpoint.SelectedValue.ToString(); }
            set { comboBoxEndpoint.Text = value; }
        }

        public string Company
        {
            get { return comboBoxCompany.SelectedValue.ToString(); }
            set { comboBoxCompany.Text = value; }
        }

        public string Legislation
        {
            get { return comboBoxLegislation.SelectedValue.ToString(); }
            set { comboBoxLegislation.Text = value; }
        }

        public string ActivityCode
        {
            get { return comboBoxActivityCode.SelectedValue.ToString(); }
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
                comboBoxCompany.DisplayMember = "Description";
                comboBoxCompany.ValueMember = "Uuid";
            }
        }

        public object LegislationList
        {
            get { return null; }
            set
            {
                comboBoxLegislation.DataSource = value;
                comboBoxLegislation.DisplayMember = "Description";
                comboBoxLegislation.ValueMember = "Uuid";
            }
        }

        public object ActivityCodeList
        {
            get { return null; }
            set
            {
                comboBoxActivityCode.DataSource = value;
                comboBoxActivityCode.DisplayMember = "Description";
                comboBoxActivityCode.ValueMember = "Uuid";
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

        private void btnOk_Click(object sender, EventArgs e)
        {
            _publisherDelegate(this);
        }

        PublisherDocumentTemplateDelegate _publisherDelegate = null;
        public void Publisher(PublisherDocumentTemplateDelegate publisherDelegate) 
        {
            _publisherDelegate = publisherDelegate;
        }

        private void textBoxDescription_TextChanged(object sender, EventArgs e)
        {
            btnOk_enable();
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
                _endpointDelegate(comboBoxEndpoint.SelectedValue.ToString(), _syracuseCustomDataDelegate(), this);
            }
        }

        private EndpointDelegate _endpointDelegate = null;
        public void setEndpointDelegate(EndpointDelegate endpointDelegate)
        {
            _endpointDelegate = endpointDelegate;
        }

        private SyracuseCustomDataDelegate _syracuseCustomDataDelegate = null;
        public void setSyracuseCustomDataDelegate(SyracuseCustomDataDelegate syracuseCustomDataDelegate)
        {
            _syracuseCustomDataDelegate = syracuseCustomDataDelegate;
        }

        private void textBoxCode_TextChanged(object sender, EventArgs e)
        {
            btnOk_enable();
        }
        private void btnOk_enable()
        {
            btnOk.Enabled = (!string.IsNullOrEmpty(textBoxDescription.Text) && !string.IsNullOrEmpty(textBoxCode.Text));
        }
    }
}
