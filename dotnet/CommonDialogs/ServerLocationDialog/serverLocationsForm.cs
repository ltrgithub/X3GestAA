using System;
using System.Collections.Generic;
using System.Windows.Forms;

namespace CommonDialogs.ServerLocationDialog
{
    public delegate Boolean PreferencesFileDelegate(ref List<Uri> prefUrls, String prefFilePath);
    public delegate void UpdateServerLocationsDelegate(List<Uri> uriList, String prefFilePath);
    public delegate void PostUpdateDelegate(bool force = false);
    
    public partial class serverLocationsDialog : Form
    {
        private String _prefFilePath;
        private PreferencesFileDelegate _preferencesFileDelegate;
        private UpdateServerLocationsDelegate _updateServerLocationsDelegate;
        private PostUpdateDelegate _postUpdateDelegate;
        public serverLocationsDialog(   String prefFilePath, 
                                        PreferencesFileDelegate preferencesFileDelegate, 
                                        UpdateServerLocationsDelegate updateServerLocationsDelegate,
                                        PostUpdateDelegate postUpdateDelegate)
        {
            InitializeComponent();
            _prefFilePath = prefFilePath;
            _preferencesFileDelegate = preferencesFileDelegate;
            _updateServerLocationsDelegate = updateServerLocationsDelegate;
            _postUpdateDelegate = postUpdateDelegate;
        }

        private void serverLocationsForm_Load(object sender, EventArgs e)
        {
            List<Uri> _prefUrls = null;
            serverLocationsListBox.Items.Clear();
            _preferencesFileDelegate(ref _prefUrls, _prefFilePath);
            _prefUrls.ForEach(delegate (Uri uri)
            {
                serverLocationsListBox.Items.Add(uri.ToString());
            });

            updateButtonState();

            if (serverLocationsListBox.Items.Count > 0)
                serverLocationsListBox.SelectedIndex = 0;
        }

        private void upButton_Click(object sender, EventArgs e)
        {
            int selectedIndex = serverLocationsListBox.SelectedIndex;
            String uri = serverLocationsListBox.Items[selectedIndex].ToString();
            serverLocationsListBox.Items.RemoveAt(selectedIndex);
            serverLocationsListBox.Items.Insert(selectedIndex - 1, uri);
            serverLocationsListBox.SelectedIndex = selectedIndex - 1;
        }

        private void downButton_Click(object sender, EventArgs e)
        {
            int selectedIndex = serverLocationsListBox.SelectedIndex;
            String uri = serverLocationsListBox.Items[selectedIndex].ToString();
            serverLocationsListBox.Items.RemoveAt(selectedIndex);
            serverLocationsListBox.Items.Insert(selectedIndex + 1, uri);
            serverLocationsListBox.SelectedIndex = selectedIndex + 1;
        }

        private void serverLocationsListBox_SelectedIndexChanged(object sender, EventArgs e)
        {
            updateButtonState();
        }

        private void removeButton_Click(object sender, EventArgs e)
        {
            removeListEntry();
        }

        private void updateButtonState()
        {
            upButton.Enabled = serverLocationsListBox.Items.Count > 1 && serverLocationsListBox.SelectedIndex != 0;
            downButton.Enabled = serverLocationsListBox.Items.Count > 1 && !(serverLocationsListBox.SelectedIndex == serverLocationsListBox.Items.Count - 1);
            removeButton.Enabled = serverLocationsListBox.Items.Count > 0;
        }

        private void cancelButton_Click(object sender, EventArgs e)
        {
            Close();
        }

        private void okButton_Click(object sender, EventArgs e)
        {
            List<Uri> uriList = new List<Uri>();
            foreach (string item in serverLocationsListBox.Items)
            {
                uriList.Add(new Uri(item));
            };
            _updateServerLocationsDelegate(uriList, _prefFilePath);
            _postUpdateDelegate(true);
            Close();
        }

        private void serverLocationsListBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Delete && serverLocationsListBox.Items.Count > 0)
                removeListEntry();
        }

        private void removeListEntry()
        {
            int selectedIndex = serverLocationsListBox.SelectedIndex;
            serverLocationsListBox.Items.RemoveAt(selectedIndex);
            updateButtonState();
            serverLocationsListBox.SelectedIndex = Math.Min(selectedIndex, serverLocationsListBox.Items.Count - 1);
        }
    }
}
