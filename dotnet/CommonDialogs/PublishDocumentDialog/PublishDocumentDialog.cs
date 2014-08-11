using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using CommonDialogs.PublishDocumentDialog;

namespace CommonDialogs.PublishDocumentDialog
{
    public partial class PublishDocumentDialog : Form, IPublishDocumentDialog
    {
        public PublishDocumentDialog()
        {
            InitializeComponent();
        }

        private void PublishDocument_Load(object sender, EventArgs e)
        {
            //this.Text = Properties.Resources.PUBLISH_DOCUMENT_DIALOG_LABEL;
            //groupBoxDescription.Text = Properties.Resources.PUBLISH_DOCUMENT_GROUPBOX;
            //labelDescription.Text = Properties.Resources.PUBLISH_DOCUMENT_DESCRIPTION_LABEL;
            //labelStorageVolume.Text = Properties.Resources.PUBLISH_DOCUMENT_STORAGE_VOLUME_LABEL;
            //labelOwner.Text = Properties.Resources.PUBLISH_DOCUMENT_OWNER_LABEL;
            //checkBoxReadOnly.Text = Properties.Resources.PUBLISH_DOCUMENT_READONLY_LABEL;
        }
        
        public string Description
        {
            get { return textBoxDescription.Text; }
            set { textBoxDescription.Text = value; }
        }

        public string StorageVolume
        {
            get { return comboBoxStorageVolume.Text; }
            set { comboBoxStorageVolume.Text = value; }
        }

        public new string Owner
        {
            get { return comboBoxOwner.Text; }
            set { comboBoxOwner.Text = value; }
        }

        public List<string> StorageVolumeList
        {
            get { return null; }
            set { comboBoxStorageVolume.DataSource = new BindingSource( value, null).DataSource; }
        }

        public List<string> OwnerList
        {
            get { return null; }
            set { comboBoxOwner.DataSource = new BindingSource(value, null).DataSource; }
        }

        public DialogResult DialogShow()
        {
            return ShowDialog();
        }
    }
}
