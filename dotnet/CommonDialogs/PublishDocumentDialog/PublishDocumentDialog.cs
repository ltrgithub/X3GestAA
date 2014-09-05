using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using CommonDialogs.PublishDocumentDialog;
using System.Collections;

namespace CommonDialogs.PublishDocumentDialog
{
    public partial class PublishDocumentDialog : Form, IPublishDocumentDialog
    {
        public PublishDocumentDialog()
        {
            InitializeComponent();
        }
      
        public string Description
        {
            get { return textBoxDescription.Text; }
            set { textBoxDescription.Text = value; }
        }

        public string StorageVolume
        {
            get { return comboBoxStorageVolume.SelectedValue.ToString(); }
            set { comboBoxStorageVolume.Text = value; }
        }

        public new string Owner
        {
            get { return comboBoxOwner.SelectedValue.ToString(); }
            set { comboBoxOwner.Text = value; }
        }

        public new CheckedListBox.CheckedItemCollection Tag
        {
            get { return checkedListBoxTags.CheckedItems; }
        }

        public CheckedListBox.CheckedItemCollection Team
        {
            get { return checkedListBoxTeams.CheckedItems; }
        }

        public object StorageVolumeList
        {
            get { return null; }
            set { 
                comboBoxStorageVolume.DataSource = value;
                comboBoxStorageVolume.DisplayMember = "Code";
                comboBoxStorageVolume.ValueMember = "Uuid";
            } 
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
            _publisherDelegate(this, _workingCopyPrototypeModel);
        }

        private PublisherDocumentDelegate _publisherDelegate = null;
        private object _workingCopyPrototypeModel = null;
        public void Publisher(PublisherDocumentDelegate publisherDelegate, object workingCopyPrototypeModel) 
        {
            _publisherDelegate = publisherDelegate;
            _workingCopyPrototypeModel = workingCopyPrototypeModel;
        }

        private void textBoxDescription_TextChanged(object sender, EventArgs e)
        {
            btnOk.Enabled = !string.IsNullOrEmpty(textBoxDescription.Text);
        }
    }
}
