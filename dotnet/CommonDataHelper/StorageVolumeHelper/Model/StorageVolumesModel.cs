using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.StorageVolumeHelper.Model
{
    public class StorageVolumesModel
    {
        [JsonProperty("$resources")]
        public List<StorageVolumeModel> storageVolumes { get; set; }
    }
}
