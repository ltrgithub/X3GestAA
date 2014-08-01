using System;
using System.Windows.Forms;
using System.IO;
using System.Net;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Runtime.Serialization;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;




namespace WordAddIn
{
    public partial class PublishDocument : Form
    {
        private JavaScriptSerializer ser = new JavaScriptSerializer();
        private CommonData cd = new CommonData();
        
        public PublishDocument()
        {
            InitializeComponent();
        }

        private void PublishDocument_Load(object sender, EventArgs e)
        {
            //System.Diagnostics.Debugger.Launch();
            getOwner(null);
            getStorageVolume(null);

            getTeams(null);
            // generate 1 team
            getTeam(null);
        }

        private void textBoxDescription_TextChanged(object sender, EventArgs e)
        {
        }

        private void btnOk_Click_1(object sender, EventArgs e)
        {
            getTeam(null);
        }

        private void btnCancel_Click_1(object sender, EventArgs e)
        {
        }

        private void getOwner(NetworkCredential nc)
        {
            //string page = "http://localhost:8124/syracuse-main/html/main.html?url=/sdata/syracuse/collaboration/syracuse/users?representation=user.$query";
            //string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/$prototypes('user.$query')";
            string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/users?representation=user.$query&count=200";
            
            string responseJson = cd.getData(page, null);
            if (responseJson != "-1")
            {
                Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(responseJson);
                Object[] listData = (Object[])data["$resources"];
                foreach (Object rowData in listData)
                {
                    try
                    {
                        Dictionary<String, object> rowDataArray = (Dictionary<String, object>)rowData;
                        foreach (Object key in rowDataArray.Keys)
                        {
                            if (key.ToString() == "login")
                            {
                                string val = rowDataArray["login"].ToString();
                                comboBoxOwner.Items.Add(val);
                            }
                        }

                    }
                    catch { }
                }
            }

        }
        private void getStorageVolume(NetworkCredential nc)
        {
            //string page = "http://localhost:8124/syracuse-main/html/main.html?url=/sdata/syracuse/collaboration/syracuse/users?representation=user.$query";
            //string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/$prototypes('user.$query')";
            string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/storageVolumes?representation=storageVolumes.$query&count=200";

            string responseJson = cd.getData(page, null);
            if (responseJson != "-1")
            {
                Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(responseJson);
                Object[] listData = (Object[])data["$resources"];
                foreach (Object rowData in listData)
                {
                    try
                    {
                        Dictionary<String, object> rowDataArray = (Dictionary<String, object>)rowData;
                        foreach (Object key in rowDataArray.Keys)
                        {
                            if (key.ToString() == "code")
                            {
                                string val = rowDataArray["code"].ToString();
                                comboBoxStorageVolume.Items.Add(val);
                            }
                        }

                    }
                    catch { }
                }
            }
        }

        private void getTeams(NetworkCredential nc)
        {
            string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/teams?representation=teams.$query&count=200";

            System.Diagnostics.Debugger.Launch();

            string responseJson = cd.getData(page, null);
            //SyracuseTeams teams = new SyracuseTeams();
            //SyracuseTeam team = new SyracuseTeam();

            //DataContractJsonSerializer ser2 = new DataContractJsonSerializer(typeof(SyracuseTeam));
            //JavaScriptSerializer ser3 = new JavaScriptSerializer(typeof(SyracuseTeam));
            //var team = (List<SyracuseTeam>)ser2.Deserialize(responseJson);

            if (responseJson != "-1")
            {
                responseJson = "{\"$resources\":[{\"$uuid\":\"uid123\",\"description\":\"des123\",\"isPublic\":true},{\"$uuid\":\"uid456\",\"description\":\"des456\",\"isPublic\":false}]}";
                JObject jss = JObject.Parse(responseJson);
                Object sTeams = (Object)jss["$resources"];
                SyracuseTeam[] aTeam = (SyracuseTeam[])sTeams;

                Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(responseJson);
                Object[] listData = (Object[])data["$resources"];
                foreach (Object rowData in listData)
                {
                    try
                    {
                        Dictionary<String, object> rowDataArray = (Dictionary<String, object>)rowData;
                        foreach (Object key in rowDataArray.Keys)
                        {
                            if (key.ToString() == "code")
                            {
                                string val = rowDataArray["code"].ToString();
                                comboBoxStorageVolume.Items.Add(val);
                            }
                        }

                    }
                    catch { }
                }
            }
        }
        
        private void getTeam(NetworkCredential nc)
        {
            /*
     "$uuid": "59c9794d-74ee-44c9-a23d-041dd29079f6",
      "$key": "59c9794d-74ee-44c9-a23d-041dd29079f6",
      "$etag": 1,
      "$creUser": "messner",
      "$creDate": "2014-07-28T13:13:51.730Z",
      "$updUser": "messner",
      "$updDate": "2014-07-28T13:46:28.465Z",
      "$properties": {},
      "$url": "/sdata/syracuse/collaboration/syracuse/teams('59c9794d-74ee-44c9-a23d-041dd29079f6')?representation=team.$details",
      "$shortUrl": "/sdata/syracuse/collaboration/syracuse/teams('59c9794d-74ee-44c9-a23d-041dd29079f6')",
      "description": "111",
      "isPublic": false,
      "explorer": {
        "$url": "{$baseUrl}/{$pluralType}('{$key}')/$graphs/explorer",
        "$type": "graph"
      },
      "tags": {
        "$url": "{$baseUrl}/{$pluralType}('{$key}')/$tagClouds/tags",
        "$type": "tag-cloud"
      },
      "administrator": {
        "$uuid": "36cf3c41-14c8-459e-9ccc-6f97f1223247",
        "$key": "36cf3c41-14c8-459e-9ccc-6f97f1223247",
        "login": "messner",
        "firstName": "JÃ¼rgen",
        "lastName": "MeÃŸnerxxx"
      },
      "$value": "111"            

              
           
            */

            System.Diagnostics.Debugger.Launch();

            string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/teams?representation=team.$edit";
            string setData = "{\"$etag\":1,\"$uuid\":\"14ee72d4-576d-4dcb-a86e-355e682db83e\",\"description\":\"112\",\"$url\":\"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('f8494ab9-977b-4dd3-bf03-9ecc04bd2682')?representation=team.$edit&role=53b82839-edcd-4460-bfbf-e86700e3e3ba&trackingId=f8494ab9-977b-4dd3-bf03-9ecc04bd2682\"}";

            Team team = new Team();
            team.description = "123";
            team.isPublic = false;
            setData = new JavaScriptSerializer().Serialize(team);

            string responseJson = cd.setData(page, setData, null);

            /*
            if (responseJson != "-1")
            {
                Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(responseJson);
                Object[] listData = (Object[])data["$resources"];
                foreach (Object rowData in listData)
                {
                    try
                    {
                        Dictionary<String, object> rowDataArray = (Dictionary<String, object>)rowData;
                        foreach (Object key in rowDataArray.Keys)
                        {
                            if (key.ToString() == "login")
                            {
                                string val = rowDataArray["login"].ToString();
                                comboBoxOwner.Items.Add(val);
                            }
                        }

                    }
                    catch { }
                }
            }
            */
        }

    }
}
